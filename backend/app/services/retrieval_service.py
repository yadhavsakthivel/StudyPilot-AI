"""Lexical Retrieval Service.
Implements keyword-based and token-matching chunk retrieval across document pages
strictly without vector databases, embeddings, or ML models.
"""

import re
import math
from typing import List, Tuple, Set
from ..models.schemas import Material, MaterialPage, Citation

STOP_WORDS: Set[str] = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
    "aren't", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both",
    "but", "by", "can", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does",
    "doesn't", "doing", "don't", "down", "during", "each", "few", "for", "from", "further",
    "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "her", "here", "hers",
    "herself", "him", "himself", "his", "how", "i", "if", "in", "into", "is", "isn't", "it",
    "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not",
    "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out",
    "over", "own", "same", "she", "should", "shouldn't", "so", "some", "such", "than", "that",
    "the", "their", "theirs", "them", "themselves", "then", "there", "these", "they", "this",
    "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "were",
    "weren't", "what", "when", "where", "which", "while", "who", "whom", "why", "with", "won't",
    "would", "wouldn't", "you", "your", "yours", "yourself", "yourselves", "tell", "explain",
    "describe", "give", "list", "define", "what's"
}

def clean_tokens(text: str) -> List[str]:
    # Extract lowercased alphanumeric words
    tokens = re.findall(r'[a-zA-Z0-9]+', text.lower())
    return [t for t in tokens if len(t) > 1]

def filter_meaningful_tokens(tokens: List[str]) -> List[str]:
    return [t for t in tokens if t not in STOP_WORDS]

class RetrievalService:
    @staticmethod
    def chunk_page_text(page_number: int, text: str) -> List[Tuple[int, str]]:
        """
        Splits a page into logical paragraphs/chunks of ~80-160 words to allow precise citations.
        """
        paragraphs = [p.strip() for p in re.split(r'\n\s*\n', text) if p.strip()]
        chunks: List[Tuple[int, str]] = []

        for para in paragraphs:
            # If paragraph is long, split by sentences
            words = para.split()
            if len(words) > 180:
                sentences = re.split(r'(?<=[.!?])\s+', para)
                current_chunk: List[str] = []
                current_len = 0
                for sent in sentences:
                    sent_words = len(sent.split())
                    if current_len + sent_words > 140 and current_chunk:
                        chunks.append((page_number, " ".join(current_chunk).strip()))
                        current_chunk = [sent]
                        current_len = sent_words
                    else:
                        current_chunk.append(sent)
                        current_len += sent_words
                if current_chunk:
                    chunks.append((page_number, " ".join(current_chunk).strip()))
            else:
                chunks.append((page_number, para))

        if not chunks and text.strip():
            chunks.append((page_number, text.strip()))

        return chunks

    def retrieve_relevant_chunks(
        self,
        material: Material,
        query: str,
        top_k: int = 4
    ) -> Tuple[List[Citation], bool, float]:
        """
        Score all chunks against query tokens using BM25-like lexical weighting.
        Returns:
            Tuple of (List[Citation], has_supporting_evidence, max_relevance_score)
        """
        query_raw_tokens = clean_tokens(query)
        query_keywords = filter_meaningful_tokens(query_raw_tokens)
        
        # If all query tokens are stop words (e.g. "what is it"), fallback to raw tokens
        search_terms = query_keywords if query_keywords else query_raw_tokens
        if not search_terms:
            return [], False, 0.0

        # Collect chunks across all pages
        all_chunks: List[Tuple[int, str]] = []
        for page in material.pages:
            chunks = self.chunk_page_text(page.page_number, page.text)
            all_chunks.extend(chunks)

        if not all_chunks:
            return [], False, 0.0

        # Document frequencies for search terms
        doc_count = len(all_chunks)
        df: dict = {term: 0 for term in search_terms}
        for _, chunk_text in all_chunks:
            chunk_tokens_set = set(clean_tokens(chunk_text))
            for term in search_terms:
                if term in chunk_tokens_set:
                    df[term] += 1

        # Score chunks
        scored_chunks = []
        clean_query_str = " ".join(search_terms)

        for page_num, chunk_text in all_chunks:
            chunk_tokens = clean_tokens(chunk_text)
            if not chunk_tokens:
                continue
            chunk_token_set = set(chunk_tokens)
            score = 0.0

            # Match search terms with IDF weighting
            matched_terms_count = 0
            for term in search_terms:
                if term in chunk_token_set:
                    matched_terms_count += 1
                    term_df = df.get(term, 1)
                    # Standard BM25 IDF: log(1 + (N - df + 0.5) / (df + 0.5))
                    idf = math.log(1.0 + (doc_count - term_df + 0.5) / (term_df + 0.5))
                    term_count = chunk_tokens.count(term)
                    # Term frequency normalization
                    tf = term_count / (term_count + 1.2 * (0.25 + 0.75 * (len(chunk_tokens) / 120.0)))
                    score += idf * tf

            # Exact phrase bonus
            lower_chunk = chunk_text.lower()
            if len(search_terms) > 1:
                # 2-word phrase or full query match bonus
                if clean_query_str in lower_chunk:
                    score += 4.0
                else:
                    for i in range(len(search_terms) - 1):
                        bigram = f"{search_terms[i]} {search_terms[i+1]}"
                        if bigram in lower_chunk:
                            score += 1.5

            if matched_terms_count > 0:
                # Coverage ratio bonus
                coverage = matched_terms_count / len(search_terms)
                score *= (0.5 + 0.5 * coverage)
                scored_chunks.append((page_num, chunk_text, score, coverage))

        scored_chunks.sort(key=lambda x: x[2], reverse=True)

        # Select top chunks with diversity across pages if possible
        selected_citations: List[Citation] = []
        seen_pages = set()
        
        for page_num, chunk_text, score, coverage in scored_chunks:
            if len(selected_citations) >= top_k:
                break
            # Pick highest scored, limiting max 2 chunks per single page unless needed
            if page_num in seen_pages and len([c for c in selected_citations if c.page_number == page_num]) >= 2:
                continue

            seen_pages.add(page_num)
            # Create a clean excerpt (up to 280 characters with ellipsis if needed)
            excerpt = chunk_text.strip()
            if len(excerpt) > 300:
                excerpt = excerpt[:297] + "..."

            selected_citations.append(Citation(
                page_number=page_num,
                excerpt=excerpt,
                score=round(score, 3)
            ))

        max_score = scored_chunks[0][2] if scored_chunks else 0.0
        # Determine if evidence is sufficient:
        # Must have at least 1 matched chunk with score >= 0.35 and matching at least some query term
        has_evidence = len(selected_citations) > 0 and max_score >= 0.35

        return selected_citations, has_evidence, round(max_score, 2)

retrieval_service = RetrievalService()
