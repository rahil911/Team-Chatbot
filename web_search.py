"""
Web Search Tool for Agent Research
Provides agents with ability to search online for information not in their knowledge graph
"""
import requests
from typing import List, Dict, Optional
import json
from urllib.parse import quote_plus


class WebSearchTool:
    """
    Simple web search tool for agents to research topics online.
    Uses DuckDuckGo Instant Answer API (no API key required)
    """

    def __init__(self):
        self.base_url = "https://api.duckduckgo.com/"
        self.headers = {
            'User-Agent': 'AI-Team-Research-Bot/1.0'
        }

    def search(self, query: str, max_results: int = 3) -> Dict[str, any]:
        """
        Search the web for information.

        Args:
            query: Search query string
            max_results: Maximum number of results to return (default 3)

        Returns:
            Dictionary with:
            - query: Original query
            - results: List of search results
            - summary: Brief summary of findings
            - sources: List of source URLs
        """
        try:
            print(f"\n🔍 [WEB SEARCH] Researching: {query}", flush=True)

            # DuckDuckGo Instant Answer API
            encoded_query = quote_plus(query)
            url = f"{self.base_url}?q={encoded_query}&format=json&no_html=1&skip_disambig=1"

            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()

            data = response.json()

            # Extract relevant information
            results = []
            sources = []

            # Abstract (Wikipedia summary)
            if data.get('Abstract'):
                results.append({
                    'title': data.get('Heading', query),
                    'snippet': data.get('Abstract', '')[:500],
                    'url': data.get('AbstractURL', '')
                })
                if data.get('AbstractURL'):
                    sources.append(data['AbstractURL'])

            # Related Topics
            for topic in data.get('RelatedTopics', [])[:max_results]:
                if isinstance(topic, dict) and 'Text' in topic:
                    results.append({
                        'title': topic.get('Text', '').split(' - ')[0] if ' - ' in topic.get('Text', '') else 'Related Info',
                        'snippet': topic.get('Text', '')[:300],
                        'url': topic.get('FirstURL', '')
                    })
                    if topic.get('FirstURL'):
                        sources.append(topic['FirstURL'])

            # If no results, create a basic response
            if not results:
                results.append({
                    'title': f"Search: {query}",
                    'snippet': "No instant answer available. Consider this a topic requiring deeper research or domain-specific knowledge.",
                    'url': ""
                })

            # Create summary
            summary = self._create_summary(query, results)

            search_result = {
                'query': query,
                'results': results[:max_results],
                'summary': summary,
                'sources': list(set(sources[:max_results])),  # Unique sources
                'result_count': len(results)
            }

            print(f"    ✅ Found {len(results)} results", flush=True)
            return search_result

        except requests.RequestException as e:
            print(f"    ❌ Web search failed: {e}", flush=True)
            return {
                'query': query,
                'results': [],
                'summary': f"Web search temporarily unavailable: {str(e)}",
                'sources': [],
                'result_count': 0,
                'error': str(e)
            }

    def _create_summary(self, query: str, results: List[Dict]) -> str:
        """Create a brief summary from search results"""
        if not results:
            return f"No information found for '{query}'"

        # Use first result's snippet as primary summary
        primary = results[0].get('snippet', '')[:200]

        if len(results) > 1:
            return f"{primary}... (Based on {len(results)} sources)"
        else:
            return primary

    def research_topic(self, topic: str, context: str = "") -> str:
        """
        Research a topic and return formatted text for agent responses.

        Args:
            topic: Topic to research
            context: Optional context about why researching (for logging)

        Returns:
            Formatted research text agents can include in responses
        """
        results = self.search(topic, max_results=3)

        if results.get('error'):
            return f"**Research Note:** Unable to research '{topic}' online at this time."

        # Format for agent use
        formatted = f"**Research on {topic}:**\n\n"
        formatted += f"{results['summary']}\n\n"

        if results['sources']:
            formatted += "**Sources:**\n"
            for i, source in enumerate(results['sources'], 1):
                formatted += f"{i}. {source}\n"

        return formatted.strip()


# Global instance
_web_search_tool = None


def get_web_search_tool() -> WebSearchTool:
    """Get or create the global web search tool instance"""
    global _web_search_tool
    if _web_search_tool is None:
        _web_search_tool = WebSearchTool()
    return _web_search_tool
