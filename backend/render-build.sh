#!/usr/bin/env bash
set -e

pip install -r requirements.txt
python import_data.py
python import_syngenta.py
python train_model.py
