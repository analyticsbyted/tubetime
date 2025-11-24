#!/usr/bin/env python3
"""
Filter active (non-expired) YouTube cookies from a cookie file.
Removes expired cookies to reduce file size for Hugging Face Spaces secrets.
"""

import sys
import time

def filter_active_cookies(input_file, output_file):
    """Extract only active (non-expired) YouTube cookies."""
    active_cookies = []
    header_lines = []
    current_time = int(time.time())
    expired_count = 0
    active_count = 0
    
    with open(input_file, 'r', encoding='utf-8') as f:
        for line in f:
            # Keep header lines (comments)
            if line.startswith('#'):
                header_lines.append(line)
                continue
            
            # Parse cookie line (Netscape format)
            parts = line.strip().split('\t')
            if len(parts) >= 5:
                try:
                    expiry = int(parts[4])
                    # Keep cookies that are:
                    # - Not expired (expiry = 0 means session cookie, or expiry > current_time)
                    # - Only .youtube.com cookies
                    if '.youtube.com' in parts[0] and (expiry == 0 or expiry > current_time):
                        active_cookies.append(line)
                        active_count += 1
                    else:
                        expired_count += 1
                except (ValueError, IndexError):
                    # If we can't parse, keep it if it's YouTube-related
                    if '.youtube.com' in line:
                        active_cookies.append(line)
                        active_count += 1
            elif '.youtube.com' in line:
                # Keep malformed lines that are YouTube-related
                active_cookies.append(line)
                active_count += 1
    
    # Write filtered cookies
    with open(output_file, 'w', encoding='utf-8') as f:
        # Write headers
        for header in header_lines:
            f.write(header)
        
        # Write active cookies
        for cookie in active_cookies:
            f.write(cookie)
    
    print(f"✅ Filtered cookies:")
    print(f"   Active: {active_count}")
    print(f"   Expired (removed): {expired_count}")
    print(f"   Output: {output_file}")

if __name__ == '__main__':
    input_file = sys.argv[1] if len(sys.argv) > 1 else 'youtube-cookie-filtered.txt'
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'youtube-cookie-active.txt'
    
    filter_active_cookies(input_file, output_file)

