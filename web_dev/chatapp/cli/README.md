# CLI Chat App

A simple terminal chat application built with Node.js, Express, and Socket.IO. Multiple clients can connect to the same server and send messages to each other in real time.

## Requirements

- Node.js installed
- npm installed

## How to Run

1. Open a terminal and go to the CLI folder:

```bash
cd cli
```

2. Install dependencies:

```bash
npm install
```

3. Start the server:

```bash
npm start
```

By default, the server runs on:

```text
http://localhost:3008
```

4. Open another terminal, go to the `cli` folder again, and start the first client:

```bash
npm run client -- Raju
```

5. Open one more terminal and start another client:

```bash
npm run client -- Bheem
```

6. Open one agian for three

```bash
npm run client -- Kalia
```

Now Raju, Bheem and Kalia can type messages and chat with each other.

## Useful Commands

Start a client with a custom name:

```bash
npm run client -- YourName
```

Connect to a custom server URL:

```bash
node client.js Alice http://localhost:3008
```

Exit the chat client:

```text
/quit
```

or

```text
/exit
```
