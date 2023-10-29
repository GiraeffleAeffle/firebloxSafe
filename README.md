# Fireblocks & Gnosis Safe-Core SDK Integration

This repository provides a poc integrating the Fireblocks SDK with Gnosis' safe-core-sdk for managing and executing transactions on Ethereum.

## Prerequisites
* Node.js and npm installed.
* An account with Fireblocks and access to your Fireblocks API key.
* A configured Gnosis Safe account.

## Installation

1. Clone this repository:

```
git clone <repository-url>
cd <repository-dir>
```

2. Install dependencies:

```
npm install
```

## Configuration

1. Rename .env.example to .env and fill in your Fireblocks API key:

```
FIREBLOCKS_API_PRIVATE_KEY_PATH=
FIREBLOCKS_API_KEY=
```

2. Fill out the private key path to the fireblocks private key you got & the api key. Choose the 'Editor' role when setting it up.

## Usage

### Fireblocks SDK

The Fireblocks SDK allows seamless integration with the Fireblocks platform, enabling key management, transaction execution, and more.

### Gnosis Safe-Core SDK

The safe-core-sdk simplifies interactions with the Gnosis Safe contracts-

## Examples & Further Reading

Refer to safe-interaction.js for an example on how the two SDKs are integrated. 

You can execute the safe-interaction.js with

```
node safe-interaction.js
```

However you should choose which functions you want to execute by commenting them or not in the async function in the bottom of the file.

For comprehensive documentation:

* [Fireblocks Official Documentation](https://developers.fireblocks.com/docs/api-sdk-overview)
* [Gnosis Safe-Core SDK GitHub](https://github.com/safe-global/safe-core-sdk)

