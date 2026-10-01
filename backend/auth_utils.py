# -*- coding: utf-8 -*-
import hashlib
import secrets
from typing import Tuple


def hash_password(password: str) -> str:
    """
    Băm mật khẩu một chiều an toàn bằng PBKDF2-HMAC-SHA256 với Salt 16 bytes ngẫu nhiên.
    Định dạng chuỗi kết quả: pbkdf2:sha256:<iterations>$<salt_hex>$<hash_hex>
    """
    salt = secrets.token_hex(16)
    iterations = 100000
    derived = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        iterations
    )
    return f"pbkdf2:sha256:{iterations}${salt}${derived.hex()}"


def verify_password(password: str, hashed_str: str) -> bool:
    """
    Kiểm tra mật khẩu văn bản thô có khớp với chuỗi hash đã lưu hay không.
    Sử dụng secrets.compare_digest để chống tấn công phân tích thời gian (timing attacks).
    """
    if not hashed_str or not password:
        return False
    try:
        parts = hashed_str.split('$')
        if len(parts) != 3:
            # Fallback nếu chuỗi là plaintext cũ (chỉ dùng trong quá trình chuyển giao)
            return secrets.compare_digest(password, hashed_str)

        algo_iter, salt, stored_hash = parts
        # Phân tích algo và iterations
        sub_parts = algo_iter.split(':')
        algo = sub_parts[1] if len(sub_parts) > 1 else 'sha256'
        iterations = int(sub_parts[2]) if len(sub_parts) > 2 else 100000

        derived = hashlib.pbkdf2_hmac(
            algo,
            password.encode('utf-8'),
            salt.encode('utf-8'),
            iterations
        )
        return secrets.compare_digest(derived.hex(), stored_hash)
    except Exception:
        return False
