from typing import List, Dict, Any

def rank_candidates(candidates_eval: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Sorts evaluated candidates deterministically using match_percentage and tie-breakers:
    1. Highest match_percentage
    2. Count of matched_mandatory skills
    3. Total experience years
    """

    def sorting_key(item: Dict[str, Any]):
        match_pct = item.get("match_percentage", 0.0)
        num_mand = len(item.get("matched_mandatory", []))
        total_exp = item.get("total_experience_years", 0.0)
        return (match_pct, num_mand, total_exp)

    sorted_candidates = sorted(candidates_eval, key=sorting_key, reverse=True)

    ranked_results = []
    for idx, cand in enumerate(sorted_candidates, start=1):
        match_pct = cand.get("match_percentage", 0.0)
        num_mand = len(cand.get("matched_mandatory", []))
        total_exp = cand.get("total_experience_years", 0.0)
        rec = cand.get("recommendation", "Moderate Match")

        justification = (
            f"Rank #{idx}: Assigned '{rec}' with {match_pct}% match score. "
            f"Successfully matched {num_mand} mandatory skill requirements with {total_exp} years of relevant experience."
        )

        ranked_results.append({
            **cand,
            "rank": idx,
            "justification": justification
        })

    return ranked_results
