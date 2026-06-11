import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr";
import { ApiBaseUrl } from "./api";
import { getAccessToken } from "./auth";

export type AdminOrderRealtimeEvent = {
  orderId: string;
  tenantId: string;
  branchId: string;
  orderStatusCode: string;
};

export type AdminWaiterCallRealtimeEvent = {
  waiterCallId: string;
  tenantId: string;
  branchId: string;
  statusCode: string;
};

export function createAdminOrderConnection(): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(`${ApiBaseUrl}/hubs/admin/orders`, {
      accessTokenFactory: () => getAccessToken() ?? ""
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.None)
    .build();
}

export async function stopConnection(connection: HubConnection): Promise<void> {
  if (connection.state !== HubConnectionState.Disconnected) {
    await connection.stop();
  }
}
