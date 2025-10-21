#!/bin/bash
cd ${1}
git fetch origin ${2}
git checkout ${2}
