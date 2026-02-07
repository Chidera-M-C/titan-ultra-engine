# Use the high-performance CUDA 12.4 image you had
FROM runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04

WORKDIR /

# Install system dependencies for Image processing
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install the pinned requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy your handler script
COPY handler.py .

# Force Python 3.11 and ensure logs are unbuffered
CMD [ "python3.11", "-u", "/handler.py" ]
