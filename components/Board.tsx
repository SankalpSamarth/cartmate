"use client";

import { useEffect, useState, useMemo } from "react";
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
import { NotificationPrompt } from "./NotificationPrompt";
import { PostSuccessSheet } from "./PostSuccessSheet";
import type { Order } from "@/lib/types";
import type { StoredPost } from "@/lib/device";
import { HOSTELS } from "@/lib/constants";
import { trackEvent } from "@/lib/analytics";

export function Board() {
  const { orders, loading, realtimeConnected, removeOrder, addOrder } = useOrders();
  const { myPost, persist, cancel } = useMyPost();
  const { getStatus, sendRequest, withdrawRequest } = useMyRequests();
  const { requests, approve, pendingCount } = useIncomingRequests(myPost?.id ?? null);

  const [selectedHostel, setSelectedHostel] = useState(() => {
    if (typeof window === "undefined") return "All";
    const sharedHostel = new URLSearchParams(window.location.search).get("hostel");
    if (sharedHostel && HOSTELS.includes(sharedHostel)) return sharedHostel;
    return localStorage.getItem("cartmate_selected_hostel") || "All";
  });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [requestTarget, setRequestTarget] = useState<Order | null>(null);
  const [requestsSheetOpen, setRequestsSheetOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<Order | null>(null);

  useEffect(() => {
    trackEvent("landing_view", {
      source: new URLSearchParams(window.location.search).has("hostel") ? "shared_link" : "direct",
    });
  }, []);

  const filteredOrders = useMemo(() => {
    if (selectedHostel === "All") return orders;
    return orders.filter((o) => o.hostel === selectedHostel);
  }, [orders, selectedHostel]);

  const handleCreated = (order: Order, stored: StoredPost) => {
    addOrder(order);
    persist(stored);
    setShareTarget(order);
    trackEvent("order_posted", { hostel: order.hostel, platform: order.platform, spots: order.max_spots });
  };

  const handleCancel = () => cancel(removeOrder);

  const handleOpenCreate = () => {
    if (myPost) return; // already have active post
    trackEvent("post_form_opened", { hostel: selectedHostel });
    setCreateModalOpen(true);
  };

  const handleHostelChange = (hostel: string) => {
    setSelectedHostel(hostel);
    localStorage.setItem("cartmate_selected_hostel", hostel);
    trackEvent("hostel_selected", { hostel });
  };

  const selectedLabel = selectedHostel === "All"
    ? "your hostel"
    : selectedHostel.replace(/^HB4\s+/i, "").replace(/\s*\(([^)]+)\)$/, " · $1");

  const handleSendRequest = async (order: Order, name: string | null, note: string) => {
    const saved = await sendRequest(order, name, note);
    if (saved) trackEvent("join_requested", { hostel: order.hostel, platform: order.platform });
    return Boolean(saved);
  };

  const handleOpenRequest = (order: Order) => {
    trackEvent("join_form_opened", { hostel: order.hostel, platform: order.platform });
    setRequestTarget(order);
  };

  const handleApprove = async (request: Parameters<typeof approve>[0]) => {
    await approve(request);
    trackEvent("request_approved");
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
        <FilterTabs selected={selectedHostel} onChange={handleHostelChange} />
      </div>

      {/* Order list */}
      <main className="board-list">
        {loading ? (
          <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state__eyebrow">The board is clear</p>
            <h2 className="empty-state__title">
              Nothing active in {selectedLabel}
            </h2>
            <p className="empty-state__sub">
              Ordering soon? Post before checkout so someone nearby can join your cart.
            </p>
            <button onClick={handleOpenCreate} className="btn btn--cta">
              I&apos;m ordering now
            </button>
            <NotificationPrompt hostel={selectedHostel === "All" ? null : selectedHostel} />
            <p className="empty-state__steps">
              Post <span>→</span> approve a request <span>→</span> finish on WhatsApp
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              requestStatus={getStatus(order.id)}
              onDelete={removeOrder}
              onRequestJoin={handleOpenRequest}
              onWithdraw={withdrawRequest}
            />
          ))
        )}
      </main>

      <footer className="board-footer">
        Built for HB4 by <span className="board-footer__name">Sankalp</span>
      </footer>

      {/* FAB */}
      {!loading && !myPost && filteredOrders.length > 0 && (
        <button
          onClick={handleOpenCreate}
          className="fab"
          title="Post an order"
          aria-label="Post an order"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      )}

      {/* Modals */}
      {createModalOpen && (
        <CreatePostModal
          isOpen
          defaultHostel={selectedHostel === "All" ? "" : selectedHostel}
          onClose={() => setCreateModalOpen(false)}
          onCreated={handleCreated}
        />
      )}
      {requestTarget && (
        <SendRequestModal
          order={requestTarget}
          onClose={() => setRequestTarget(null)}
          onSend={handleSendRequest}
        />
      )}
      <RequestsSheet
        isOpen={requestsSheetOpen}
        requests={requests}
        order={myPost ? orders.find((o) => o.id === myPost.id) ?? null : null}
        onClose={() => setRequestsSheetOpen(false)}
        onApprove={handleApprove}
      />
      {shareTarget && (
        <PostSuccessSheet order={shareTarget} onClose={() => setShareTarget(null)} />
      )}
    </>
  );
}
