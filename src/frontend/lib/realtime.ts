import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr";
import { ApiBaseUrl } from "./api";
import { getAccessToken } from "./auth";

export type AdminOrderRealtimeEvent = {
  orderId: string;
  tenantId: string;
  branchId: string;
  orderStatusCode: string;
};

export function createAdminOrderConnection(): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(`${ApiBaseUrl}/hubs/admin/orders`, {
      accessTokenFactory: () => getAccessToken() ?? ""
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build();
}

export async function stopConnection(connection: HubConnection): Promise<void> {
  if (connection.state !== HubConnectionState.Disconnected) {
    await connection.stop();
  }
}
