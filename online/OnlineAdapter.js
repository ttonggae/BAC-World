export class OnlineAdapter {
  connect() {
    throw new Error("Online play is not implemented in this offline prototype.");
  }

  disconnect() {}
}
