import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  emitQueueUpdated(stage: string, data: any) {
    this.server.emit('queue_updated', { stage, data });
  }

  emitPaymentUpdated(invoiceId: string, data: any) {
    this.server.emit('payment_updated', { invoiceId, data });
  }

  emitVisitStatusUpdated(visitId: string, status: string) {
    this.server.emit('visit_status_updated', { visitId, status });
  }
}
