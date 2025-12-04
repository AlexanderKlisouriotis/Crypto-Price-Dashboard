# Real-Time Cryptocurrency Price Dashboard
A full-stack web application demonstrating real-time data streaming capabilities using modern web technologies.

## Overview
This project showcases a full-stack implementation for streaming real-time financial data, built with TypeScript, Next.js, and Node.js. It demonstrates practical skills in browser automation, real-time communication, and scalable architecture.

## Tech Stack
TypeScript - Type-safe development

Next.js - React framework for frontend

Node.js - Backend server

Playwright - Browser automation

ConnectRPC - Type-safe RPC communication

pnpm - Package management

tsx - TypeScript execution

## Features
Real-time price updates from financial data sources

Dynamic ticker/asset management

Low-latency push-based architecture

Efficient resource sharing for multiple clients

Type-safe client-server communication

## Architecture
The application follows a scalable architecture:

Frontend: Next.js with React for UI

Backend: Node.js server with Playwright for data collection

Communication: ConnectRPC for type-safe API calls

Real-time updates: Push-based system via WebSocket/RPC

## Getting Started
### Prerequisites
Node.js v18+
pnpm
Playwright browsers

## Installation
### Clone repository
git clone https://github.com/AlexanderKlisouriotis/Crypto-Price-Dashboard
cd crypto-price-dashboard

### Install dependencies
pnpm install --recursive

### Run application
./run.sh

## Development
### Start backend
cd backend && pnpm dev

### Start frontend (separate terminal)
cd frontend && pnpm dev

## Implementation Details
### Key Design Decisions
Resource Efficiency: Single Playwright instance manages multiple data sources

Real-time Updates: Push architecture eliminates polling delays

Error Handling: Graceful degradation and automatic recovery

Scalability: Stateless design supports horizontal scaling

### Technical Challenges Solved
Efficient browser automation for data extraction

Real-time data synchronization between server and clients

Type-safe API communication across stack

Resource management for concurrent connections