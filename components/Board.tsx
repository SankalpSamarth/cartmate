"use client";

import { useState, useMemo } from "react";
import { useOrders } from "@/hooks/useOrders";
import { useMyPost } from "@/hooks/useMyPost";
import { useMyRequests } from "@/hooks/useMyRequests";
import { useIncomingRequests } from "@/hooks/useIncomingRequests";
import { LiveCounter } from "./LiveCounter";
import { FilterTabs } from "./FilterTabs";
import { OrderCard } from "./OrderCard";
import { SkeletonCard } from "./SkeletonCard";
import { MyPostBanner } from "./MyPostBanner";
import { CreatePostModal } from "./CreatePostModal";
import { SendRequestModal } from "./SendRequestModal";
import { RequestsSheet } from "./RequestsSheet";
import type { Order } from "@/lib/types";
import type { StoredPost } from "@/lib/device";

export function Board() {
  const { orders, loading, realtimeConnected, removeOrder, addOrder } = useOrders();
  const { myPost, persist, cancel } = useMyPost();
  const { getStatus, sendRequest, withdrawRequest } = useMyRequests();
  const { requests, approve, pendingCount } = useIncomingRequests(myPost?.id ?? null);

  const [selectedHostel, setSelectedHostel] = useState("All");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [requestTarget, setRequestTarget] = useState<Order | null>(null);
  const [requestsSheetOpen, setRequestsSheetOpen] = useState(false);

  const filteredOrders = useMemo(() => {
    if (selectedHostel === "All") return orders;
    return orders.filter((o) => o.hostel === selectedHostel);
  }, [orders, selectedHostel]);

  const handleCreated = (order: Order, stored: StoredPost) => {
    addOrder(order);
    persist(stored);
  };

  const handleCancel = () => cancel(removeOrder);

  const handleOpenCreate = () => {
    if (myPost) return; // already have active post
    setCreateModalOpen(true);
  };

  const handleSendRequest = async (order: Order, name: string | null, note: string) => {
    await sendRequest(order, name, note);
  };

  return (
    <>
      {/* Sticky header */}
      <div className="board-sticky">
        {myPost && (
          <MyPostBanner
            post={myPost}
            pendingCount={pendingCount}
            onCancel={handleCancel}
            onViewRequests={() => setRequestsSheetOpen(true)}
          />
        )}
        <div className="board-header">
          <div className="board-header__top">
            <div>
              <h1 className="brand">
                <span className="brand__cart">Cart</span>
                <span className="brand__mate">Mate</span>
              </h1>
              <p className="brand__sub">Split orders. Save on delivery.</p>
            </div>
          </div>
          <LiveCounter count={orders.length} realtimeConnected={realtimeConnected} />
        </div>
        <FilterTabs selected={selectedHostel} onChange={setSelectedHostel} />
      </div>

      {/* Order list */}
      <main className="board-list">
        {loading ? (
          <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">
            <h2 className="empty-state__title">
              {selectedHostel === "All"
                ? "No one's ordering right now"
                : `No orders in ${selectedHostel} right now`}
            </h2>
            <p className="empty-state__sub">
              Be the first — post your order and others will hop on.
            </p>
            <button onClick={handleOpenCreate} className="btn btn--cta">
              Post an Order
            </button>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              requestStatus={getStatus(order.id)}
              onDelete={removeOrder}
              onRequestJoin={setRequestTarget}
              onWithdraw={withdrawRequest}
            />
          ))
        )}
      </main>

      <footer className="board-footer">
        made by <span className="board-footer__name">Sankalp</span>
      </footer>

      {/* FAB */}
      {!loading && (
        <button
          onClick={handleOpenCreate}
          className={`fab ${myPost ? "fab--disabled" : ""}`}
          title={myPost ? "You already have an active post" : "Post an order"}
          aria-label="Post an order"
        >
          {myPost ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          )}
        </button>
      )}

      {/* Modals */}
      <CreatePostModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={handleCreated}
      />
      <SendRequestModal
        order={requestTarget}
        onClose={() => setRequestTarget(null)}
        onSend={handleSendRequest}
      />
      <RequestsSheet
        isOpen={requestsSheetOpen}
        requests={requests}
        order={myPost ? orders.find((o) => o.id === myPost.id) ?? null : null}
        onClose={() => setRequestsSheetOpen(false)}
        onApprove={approve}
      />
    </>
  );
}
