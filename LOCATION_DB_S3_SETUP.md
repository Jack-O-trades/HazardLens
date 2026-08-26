# Location Database S3 Distribution

The rural location database (`locations.db`) is approximately 349 MB and contains over 1.4 million records powered by a self-contained FTS5 index. Because of its size, it cannot be stored in normal Git.

Instead, we distribute this prebuilt database via AWS S3. 

## How it works

When a teammate or deployment environment starts the backend server, the application checks if `data/locations.db` exists locally.
- If it **does exist**, the backend starts normally and uses the local database. No downloading occurs.
- If it **does not exist**, the backend automatically downloads the prebuilt database from S3 and saves it to `data/locations.db` before initializing the search API.

You do **not** need the raw LGD/PMGSY datasets to run the rural location search.

## Setup Instructions

To enable automatic downloading, configure the following environment variables in your `backend/.env` file:

```env
AWS_REGION=ap-south-1
S3_BUCKET=your-s3-bucket-name
LOCATION_DB_S3_KEY=locations.db
```

### AWS Credentials

The backend uses the standard AWS SDK credential chain. You should **never** hardcode AWS credentials in the codebase.
- **Local Development:** The SDK will automatically use your AWS CLI credentials or environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`).
- **Production/Deployment:** Assign an IAM role with `s3:GetObject` permissions to your deployment environment (e.g., EC2, ECS, Lambda) and the SDK will authenticate automatically.

If the AWS S3 configuration is missing or the download fails, the backend will fail to start with a clear error preventing it from running with a broken rural search.

## Rebuilding the Database

If you have the original raw LGD/PMGSY datasets and want to rebuild the database locally:
1. Place the datasets in the designated ingestion folders (these are git-ignored).
2. Run the ingestion script (refer to the main documentation for exact commands).
3. The new database will be generated at `data/locations.db`. The backend will use it automatically without downloading from S3.
