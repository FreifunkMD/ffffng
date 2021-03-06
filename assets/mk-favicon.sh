#!/bin/bash

convert $1 \
      \( -clone 0 -resize 16x16 \) \
      \( -clone 0 -resize 32x32 \) \
      \( -clone 0 -resize 48x48 \) \
      \( -clone 0 -resize 64x64 \) \
      -bordercolor transparent -border 128x128 \
      -delete 0 -alpha off -colors 256 $2
