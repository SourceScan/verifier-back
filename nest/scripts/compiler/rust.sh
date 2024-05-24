#!/bin/bash

# Navigate to the source directory
cd "$1" || exit

# The build command is the second argument
build_command="$2"

# Execute the build command
eval "$build_command"
