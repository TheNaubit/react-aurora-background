# [2.0.0](https://github.com/TheNaubit/react-aurora-background/compare/v1.0.12...v2.0.0) (2026-09-30)


* feat!: release the WebGL aurora as a major version ([de5f98e](https://github.com/TheNaubit/react-aurora-background/commit/de5f98ed9871e400759dff400f55a024f89ac2a1))


### Bug Fixes

* follow page colors, recover evicted contexts and sanitize the fallback ([630d038](https://github.com/TheNaubit/react-aurora-background/commit/630d038276220b5c997092ed23dd5358515e9813))
* keep every fallback bubble independent and stop context thrashing ([7d39b62](https://github.com/TheNaubit/react-aurora-background/commit/7d39b622b41d9daf70088e0d376e9ff0e02e0440))
* release WebGL contexts and hide the fallback behind the canvas ([7323f15](https://github.com/TheNaubit/react-aurora-background/commit/7323f15b5f0b0b39e7c0a60c9b1895e6ce75febe))
* satisfy the linter and label every demo control ([3fda6e8](https://github.com/TheNaubit/react-aurora-background/commit/3fda6e8e7e39389ad8fae9121f0efbb9d0ecf353))


### Features

* render the aurora with a WebGL shader ([bc4f9df](https://github.com/TheNaubit/react-aurora-background/commit/bc4f9df9ee096563b130654a3dea6345413d41e1))


### BREAKING CHANGES

* the aurora is drawn by a WebGL shader instead of
blurred CSS elements, so it looks very close but not identical;
blurAmount no longer sets a CSS backdrop-filter; React 18 or 19 and
Node.js 22 or later are required; the package no longer ships CSS
module files; the class name of the provider is a separate class;
changing colors, blurAmount or animDuration updates the aurora; and
reduced motion shows a still aurora by default (respectReducedMotion).
See "Upgrading from 1.x" in the README.

# Changelog

## v1.0.12

Improved the internal structure 🔧

## v1.0.11

Added extra props and fixed build issues 🔧

## v1.0.10

Updated dependencies and fixed broken links 🔗

## v1.0.9

Improved default settings ✨

## v1.0.8

Fixed Firefox support 🔧

## v1.0.7

Fixed iOS blur issue 🔧

## v1.0.6

Added some performance improvements (now we use the GPU when possible) ✨

## v1.0.5

Fixed optimization in bubble items 🔧

## v1.0.4

Fixed build generation - part 2 🔧

## v1.0.3

Fixed build generation 🔧

## v1.0.2

Fixed demo link 🔧

## v1.0.1

Fixed docs 🔧

### v1.0.0

This is the first public version of the package, let's go! 🚀
