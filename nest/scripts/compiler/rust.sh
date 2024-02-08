#!/bin/bash

# Navigate to the source directory
cd "$1"

# Arguments after the first one are received as a single string
concat_args="${@:2}"

# Use eval to safely expand the concatenated arguments into an array
eval "args=($concat_args)"

# Start constructing the command with base cargo near build command
command="cargo near build"

# Append each argument from the array, ensuring it's quoted
for arg in "${args[@]}"; do
  # Append only if the argument is not empty
  if [[ -n $arg ]]; then
    command+=" \"$arg\""
  fi
done

# Execute the constructed command
eval "$command"
