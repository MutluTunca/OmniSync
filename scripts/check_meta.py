import httpx
import json

token = 'EAA818QAVSM0BQzbCLoL2UVt0ZBMJH2Cs5GwV8gxCzwd1DuAyjBRqjj5XVqcuKgWECsIYL9Vre5kBKsIXVx1Po4wQPkZC4gaIj4C50JswkKEH8w2ipBgL2kGkQYsSZBPyJXkMHFokrlG0TEvGTJJCeSLMFKZAAS98z4aIbsDMFv4dZAjt3ljrDBWktWH3n6WsnaRo0Hng6237EPoupXgkl23T5gkZAjWvBnlSycoPa9RgImAYTIbZCJlqzYrggC457H5McnVfy2JSKwV87XuZCxZBCjP5F7xSYJwZDZD'
user_id = '17841480487139811'

def check_all_media():
    # 1. Fetch latest 30 media
    media_url = f'https://graph.facebook.com/v20.0/{user_id}/media?fields=id,caption,timestamp&limit=30&access_token={token}'
    media_data = httpx.get(media_url).json().get("data", [])
    
    found_comments = []
    for media in media_data:
        m_id = media["id"]
        # 2. Fetch comments for each media
        comments_url = f'https://graph.facebook.com/v20.0/{m_id}/comments?fields=id,text,timestamp,from&access_token={token}'
        c_data = httpx.get(comments_url).json().get("data", [])
        for c in c_data:
            c["media_id"] = m_id
            c["media_caption"] = media.get("caption", "")[:30]
            found_comments.append(c)
            
    # Sort by timestamp desc
    found_comments.sort(key=lambda x: x["timestamp"], reverse=True)
    print(json.dumps(found_comments[:10], indent=2))

if __name__ == "__main__":
    check_all_media()
