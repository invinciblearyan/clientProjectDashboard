import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

process.env.JWT_ACCESS_SECRET ??= 'test_access_secret_minimum_32_characters';
process.env.JWT_REFRESH_SECRET ??= 'test_refresh_secret_minimum_32_characters';
