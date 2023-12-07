#!/bin/bash
cd "$1"
if [ -z "$KEEP_NAMES" ]; then
  export RUSTFLAGS='-C link-arg=-s'
else
  export RUSTFLAGS=''
fi
rustup target add wasm32-unknown-unknown
cargo build --all --target wasm32-unknown-unknown --release --target-dir "$2"