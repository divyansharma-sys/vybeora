"""
Internet Archive Integration Service
Interacts with the official Internet Archive Advanced Search and Metadata APIs.
Validates item records and detects embeddable and streamable media files.
"""
import urllib.parse
import urllib.request
import json
import logging

logger = logging.getLogger(__name__)

ARCHIVE_SEARCH_URL = "https://archive.org/advancedsearch.php"
ARCHIVE_METADATA_URL = "https://archive.org/metadata"


class InternetArchiveService:
    @staticmethod
    def search_feature_films(query="night of the living dead", rows=10):
        """
        Query Internet Archive Advanced Search API for movies.
        """
        escaped_query = urllib.parse.quote(f"{query} AND mediatype:movies")
        fields = ["identifier", "title", "description", "year", "genre", "language", "licenseurl"]
        fl_params = "&".join([f"fl[]={f}" for f in fields])
        url = f"{ARCHIVE_SEARCH_URL}?q={escaped_query}&{fl_params}&rows={rows}&output=json"

        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Vybeora-Movie-Discovery/1.0 (Educational Entertainment Platform)"},
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    return data.get("response", {}).get("docs", [])
        except Exception as e:
            logger.error(f"Error querying Internet Archive Search: {e}")
            return []

    @staticmethod
    def inspect_item(identifier):
        """
        Query Internet Archive item metadata to inspect files, formats and embedding permissions.
        """
        clean_id = urllib.parse.quote(identifier.strip())
        url = f"{ARCHIVE_METADATA_URL}/{clean_id}"

        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Vybeora-Movie-Discovery/1.0"},
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    files = data.get("files", [])
                    
                    # Find direct MP4 stream if available
                    mp4_file = None
                    for f in files:
                        name = f.get("name", "")
                        format_type = f.get("format", "")
                        if name.lower().endswith(".mp4") or "512kb" in format_type.lower() or "mp4" in format_type.lower():
                            mp4_file = name
                            break

                    server = data.get("server", "")
                    dir_path = data.get("dir", "")
                    
                    direct_url = f"https://{server}{dir_path}/{mp4_file}" if server and mp4_file else None
                    embed_url = f"https://archive.org/embed/{clean_id}"

                    return {
                        "identifier": clean_id,
                        "metadata": data.get("metadata", {}),
                        "direct_stream_url": direct_url,
                        "embed_url": embed_url,
                        "is_embeddable": True,
                    }
        except Exception as e:
            logger.error(f"Error inspecting Internet Archive item {identifier}: {e}")
            return None
