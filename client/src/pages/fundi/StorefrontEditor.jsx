import { useEffect, useRef, useState } from "react";
import FundiLayout from "./FundiLayout";
import { Banner, Spinner, EmptyState } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useConfig } from "../../context/ConfigContext";
import api, { errMsg } from "../../lib/api";

const MAX_PHOTOS = 4;
const STATUS_LABEL = { in_progress: "In progress", available: "Available", reserved: "Reserved", sold: "Sold" };
const STATUS_COLOR = {
  in_progress: "bg-terracotta/15 text-terracotta-dark",
  available: "bg-good/15 text-good",
  reserved: "bg-sand text-bark dark:bg-white/10 dark:text-sand",
  sold: "bg-bark text-white dark:bg-white/20",
};

// Compress image very aggressively to stay within D1 limits - aim for ~30KB per photo
function compressImage(file, maxWidth = 300, quality = 0.5) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

function ProductCard({ item, onChanged, onDeleted }) {
  const fileInputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ title: item.title, description: item.description, cash_price: item.cash_price, hp_price: item.hp_price });

  async function handlePhotos(e) {
    const files = Array.from(e.target.files || []).slice(0, MAX_PHOTOS - item.photos.length);
    if (files.length === 0) return;
    setBusy(true);
    try {
      // Compress images before upload to stay within Worker/D1 limits (300px width, 50% quality)
      const dataUrls = await Promise.all(files.map(f => compressImage(f, 300, 0.5)));
      const totalSize = JSON.stringify([...item.photos, ...dataUrls]).length;
      console.log("Uploading photos, total size:", totalSize, "bytes");
      
      // D1 has a 1MB row limit - warn if approaching it
      if (totalSize > 900000) {
        alert("Too many photos or photos too large. Please remove some photos first.");
        return;
      }
      
      const { data } = await api.patch(`/storefront/me/items/${item.id}`, { photos: [...item.photos, ...dataUrls] });
      onChanged(data.item);
    } catch(err) {
      console.error("Photo upload error:", err);
      alert("Photo upload failed: " + (err.response?.data?.error || err.message));
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function removePhoto(idx) {
    setBusy(true);
    try {
      const photos = item.photos.filter((_, i) => i !== idx);
      const { data } = await api.patch(`/storefront/me/items/${item.id}`, { photos });
      onChanged(data.item);
    } catch(err) {
      console.error("Remove photo error:", err);
      alert("Remove photo failed: " + (err.response?.data?.error || err.message));
    } finally {
      setBusy(false);
    }
  }

  async function saveDetails(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.patch(`/storefront/me/items/${item.id}`, form);
      onChanged(data.item);
      setEdit(false);
    } catch(err) {
      console.error("Save details error:", err);
      alert("Save failed: " + (err.response?.data?.error || err.message));
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status) {
    setBusy(true);
    try {
      const { data } = await api.patch(`/storefront/me/items/${item.id}/status`, { status });
      onChanged(data.item);
    } catch(err) {
      console.error("Status update error:", err);
      alert("Status update failed: " + (err.response?.data?.error || err.message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {edit ? (
            <input className="input !text-sm mb-2" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          ) : (
            <p className="font-semibold text-bark dark:text-sand truncate">{item.title}</p>
          )}
          <span className={`inline-block text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 mt-1 ${STATUS_COLOR[item.status]}`}>
            {STATUS_LABEL[item.status]}
          </span>
        </div>
        <button onClick={() => onDeleted(item.id)} className="text-muted hover:text-bad text-sm shrink-0">✕</button>
      </div>

      {/* Photo grid — up to 4 */}
      <div className="grid grid-cols-4 gap-2 mt-3">
        {item.photos.map((p, i) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-bark/10 dark:border-white/10">
            <img src={p} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => removePhoto(i)}
              className="absolute top-1 right-1 h-5 w-5 rounded-full bg-bark/70 text-white text-xs flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        ))}
        {item.photos.length < MAX_PHOTOS && (
          <label className="aspect-square rounded-lg border-2 border-dashed border-bark/20 dark:border-white/20 flex items-center justify-center text-xs text-muted dark:text-sand/40 cursor-pointer hover:border-terracotta">
            {busy ? "…" : `+ Photo (${item.photos.length}/${MAX_PHOTOS})`}
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotos} disabled={busy} />
          </label>
        )}
      </div>

      {edit ? (
        <form onSubmit={saveDetails} className="mt-3 space-y-2">
          <textarea className="input !text-sm" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label !mb-1">Cash price</label>
              <input className="input !text-sm" type="number" value={form.cash_price} onChange={(e) => setForm((f) => ({ ...f, cash_price: e.target.value }))} />
            </div>
            <div>
              <label className="label !mb-1">Hire purchase price</label>
              <input className="input !text-sm" type="number" value={form.hp_price} onChange={(e) => setForm((f) => ({ ...f, hp_price: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary !text-xs !py-1.5" disabled={busy}>Save</button>
            <button type="button" className="btn-secondary !text-xs !py-1.5" onClick={() => setEdit(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <>
          {item.description && <p className="text-xs text-muted dark:text-sand/50 mt-2">{item.description}</p>}
          <div className="flex items-center gap-3 mt-2 text-sm">
            <span className="font-semibold text-terracotta">Cash: KES {item.cash_price.toLocaleString()}</span>
            <span className="text-muted dark:text-sand/50">HP: KES {item.hp_price.toLocaleString()}</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <button onClick={() => setEdit(true)} className="btn-secondary !text-xs !py-1.5">Edit details</button>
            {item.status === "in_progress" && (
              <button onClick={() => setStatus("available")} disabled={busy} className="btn-primary !text-xs !py-1.5">✅ Mark as finished</button>
            )}
            {item.status === "available" && (
              <>
                <button onClick={() => setStatus("reserved")} disabled={busy} className="btn-secondary !text-xs !py-1.5">🔒 Mark as reserved</button>
                <button onClick={() => setStatus("sold")} disabled={busy} className="btn-secondary !text-xs !py-1.5">💸 Mark as sold</button>
                <button onClick={() => setStatus("in_progress")} disabled={busy} className="btn-ghost !text-xs !py-1.5">↩ Back to in progress</button>
              </>
            )}
            {item.status === "reserved" && (
              <>
                <button onClick={() => setStatus("available")} disabled={busy} className="btn-secondary !text-xs !py-1.5">🔓 Release reservation</button>
                <button onClick={() => setStatus("sold")} disabled={busy} className="btn-secondary !text-xs !py-1.5">💸 Mark as sold</button>
              </>
            )}
            {item.status === "sold" && (
              <button onClick={() => setStatus("available")} disabled={busy} className="btn-secondary !text-xs !py-1.5">♻️ Relist as available</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function StorefrontEditor() {
  const { user, tierConfig, refreshMe } = useAuth();
  const config = useConfig();
  const [profile, setProfile] = useState({ bio: "", trade: "", location: "", whatsapp: "", till_number: "" });
  const [items, setItems] = useState(null);
  const [newItem, setNewItem] = useState({ title: "", description: "", cash_price: "", hp_price: "" });
  const [savedMsg, setSavedMsg] = useState("");
  const [error, setError] = useState("");
  const [stkPushActive, setStkPushActive] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);

  useEffect(() => {
    if (user) {
      setProfile({ bio: user.bio || "", trade: user.trade || "", location: user.location || "", whatsapp: user.whatsapp || "", till_number: user.till_number || "" });
    }
    api.get("/storefront/me/items").then(({ data }) => setItems(data.items));
  }, [user]);

  async function saveProfile(e) {
    e.preventDefault();
    setError("");
    setSavedMsg("");
    try {
      await api.patch("/storefront/me/profile", profile);
      await refreshMe();
      setSavedMsg("Storefront updated.");
    } catch (err) {
      setError(errMsg(err));
    }
  }

  async function addItem(e) {
    e.preventDefault();
    if (!newItem.title) return;
    try {
      const { data } = await api.post("/storefront/me/items", newItem);
      setItems((prev) => [data.item, ...prev]);
      setNewItem({ title: "", description: "", cash_price: "", hp_price: "" });
    } catch(err) {
      console.error("Add item error:", err);
      alert("Failed to add item: " + (err.response?.data?.error || err.message));
    }
  }

  function updateItem(updated) {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  async function removeItem(id) {
    await api.delete(`/storefront/me/items/${id}`);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function initiateSTKPush() {
    setStkPushActive(true);
    setPaymentStatus("initiating");
    setError("");
    
    try {
      const { data } = await api.post("/payments/stk-push", {
        tier: user.tier || "pro",
        phone: user.phone,
      });
      
      setPaymentStatus("pending");
      
      // Poll for payment status
      const paymentId = data.paymentId;
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await api.get(`/payments/${paymentId}/status`);
          const payment = statusRes.data.payment;
          
          if (payment.status === "success") {
            clearInterval(pollInterval);
            setPaymentStatus("success");
            await refreshMe();
            setTimeout(() => {
              setStkPushActive(false);
              setPaymentStatus(null);
            }, 3000);
          } else if (payment.status === "failed") {
            clearInterval(pollInterval);
            setPaymentStatus("failed");
            setError("Payment failed. Please try again.");
            setTimeout(() => {
              setStkPushActive(false);
              setPaymentStatus(null);
            }, 3000);
          }
        } catch (err) {
          console.error("Status check error:", err);
        }
      }, 3000); // Poll every 3 seconds
      
      // Stop polling after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (paymentStatus === "pending") {
          setPaymentStatus("timeout");
          setError("Payment timed out. Please check your M-Pesa and try again if payment didn't go through.");
        }
      }, 120000);
      
    } catch (err) {
      setPaymentStatus("failed");
      setError(errMsg(err));
      setTimeout(() => {
        setStkPushActive(false);
        setPaymentStatus(null);
      }, 3000);
    }
  }

  const isPublic = true; // All fundis can have a storefront
  const productionUrl = import.meta.env.VITE_APP_URL || 'https://fundipro-v21.vercel.app';
  const publicUrl = `${productionUrl}/s/${user?.slug}`;

  return (
    <FundiLayout title="Your Storefront">
      <div className="space-y-6 max-w-3xl">
        <Banner kind="success">
          Your storefront is live — share it anywhere (WhatsApp, Facebook, Instagram):{" "}
          <a href={`/s/${user?.slug}`} target="_blank" rel="noreferrer" className="font-semibold underline">
            {publicUrl}
          </a>
        </Banner>

        {/* QR Code Card */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-bark dark:text-sand">Print Your QR Code</h2>
              <p className="text-sm mt-1" style={{color:"var(--muted)"}}>Print this QR code and mount it in your workshop, shop, or workspace. Clients can scan to view your storefront instantly.</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* QR Code Display */}
            <div className="bg-white p-6 rounded-xl border-2 border-dashed" style={{borderColor:"var(--border)"}}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicUrl)}`}
                alt="QR Code"
                className="w-[200px] h-[200px]"
              />
            </div>
            
            {/* Instructions */}
            <div className="flex-1 space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-xl">🖨️</span>
                <div>
                  <p className="font-semibold text-sm" style={{color:"var(--ink)"}}>How to print:</p>
                  <p className="text-xs mt-0.5" style={{color:"var(--muted)"}}>Right-click the QR code → Save image, then print on A4 paper</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <span className="text-xl">📱</span>
                <div>
                  <p className="font-semibold text-sm" style={{color:"var(--ink)"}}>Clients scan with phone camera</p>
                  <p className="text-xs mt-0.5" style={{color:"var(--muted)"}}>Opens your storefront directly - no app needed</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <span className="text-xl">🏪</span>
                <div>
                  <p className="font-semibold text-sm" style={{color:"var(--ink)"}}>Display anywhere</p>
                  <p className="text-xs mt-0.5" style={{color:"var(--muted)"}}>Workshop wall, market stall, shop window, business card</p>
                </div>
              </div>
              
              <a 
                href={`https://api.qrserver.com/v1/create-qr-code/?size=800x800&data=${encodeURIComponent(publicUrl)}`}
                download={`${user?.slug}-qr-code.png`}
                className="btn-primary text-sm inline-block"
              >
                📥 Download QR Code
              </a>
            </div>
          </div>
        </div>

        {/* Monthly Subscription Payment Section */}
        {user?.tier !== 'free' && (
          <div className="card space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h2 className="font-display font-bold text-bark dark:text-sand">💳 Pay Monthly Subscription</h2>
                <p className="text-sm mt-1" style={{color:"var(--muted)"}}>
                  Your {user?.tier === 'pro' ? 'Pro' : 'Premium'} plan costs KES {tierConfig?.price || 0} per month.
                </p>
              </div>
            </div>

            {stkPushActive && (
              <div className="bg-terracotta/10 dark:bg-terracotta/20 rounded-xl p-6 text-center space-y-3">
                {paymentStatus === "initiating" && (
                  <>
                    <div className="text-4xl">⏳</div>
                    <p className="font-semibold" style={{color:"var(--ink)"}}>Initiating payment...</p>
                  </>
                )}
                {paymentStatus === "pending" && (
                  <>
                    <div className="text-4xl">📱</div>
                    <p className="font-semibold" style={{color:"var(--ink)"}}>Check your phone!</p>
                    <p className="text-sm" style={{color:"var(--muted)"}}>
                      Enter your M-Pesa PIN to complete payment of KES {tierConfig?.price || 0}
                    </p>
                    <Spinner />
                  </>
                )}
                {paymentStatus === "success" && (
                  <>
                    <div className="text-4xl">✅</div>
                    <p className="font-semibold text-good">Payment successful!</p>
                    <p className="text-sm" style={{color:"var(--muted)"}}>Your account has been activated.</p>
                  </>
                )}
                {paymentStatus === "failed" && (
                  <>
                    <div className="text-4xl">❌</div>
                    <p className="font-semibold text-bad">Payment failed</p>
                    <p className="text-sm" style={{color:"var(--muted)"}}>{error}</p>
                  </>
                )}
              </div>
            )}
            
            <div className="bg-terracotta/10 dark:bg-terracotta/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📱</span>
                <div>
                  <p className="font-semibold" style={{color:"var(--ink)"}}>Pay via M-Pesa</p>
                  <p className="text-sm" style={{color:"var(--muted)"}}>Choose your preferred payment method</p>
                </div>
              </div>

              {/* STK Push Button */}
              <button
                onClick={initiateSTKPush}
                disabled={stkPushActive}
                className="btn-primary w-full py-3 text-base"
              >
                {stkPushActive ? "Processing..." : "💳 Pay Now with M-Pesa STK Push"}
              </button>
              <p className="text-xs text-center" style={{color:"var(--muted)"}}>
                Get instant payment prompt on your phone ({user?.phone})
              </p>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" style={{borderColor:"var(--border)"}}></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-terracotta/10 dark:bg-terracotta/20 px-2" style={{color:"var(--muted)"}}>Or pay manually</span>
                </div>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="bg-white dark:bg-bark rounded-lg p-3">
                  <p className="text-xs font-semibold mb-1" style={{color:"var(--muted)"}}>Till Number:</p>
                  <p className="text-2xl font-bold text-terracotta">{config.platform_till_number || "1725732"}</p>
                </div>
                <div className="bg-white dark:bg-bark rounded-lg p-3">
                  <p className="text-xs font-semibold mb-1" style={{color:"var(--muted)"}}>Amount:</p>
                  <p className="text-2xl font-bold text-terracotta">KES {tierConfig?.price || 0}</p>
                </div>
              </div>

              <div className="text-xs space-y-1" style={{color:"var(--muted)"}}>
                <p>📍 <strong>Manual payment steps:</strong></p>
                <ol className="list-decimal ml-5 space-y-0.5">
                  <li>Go to M-Pesa menu on your phone</li>
                  <li>Select "Lipa Na M-Pesa" → "Buy Goods and Services"</li>
                  <li>Enter Till Number: <strong>{config.platform_till_number || "1725732"}</strong></li>
                  <li>Enter amount: <strong>KES {tierConfig?.price || 0}</strong></li>
                  <li>Enter your M-Pesa PIN and confirm</li>
                </ol>
                <p className="mt-2">✅ Your account will be activated within 1 hour of payment confirmation.</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={saveProfile} className="card space-y-4">
          <h2 className="font-display font-bold text-bark dark:text-sand">Profile</h2>
          {error && <Banner kind="error">{error}</Banner>}
          {savedMsg && <Banner kind="success">{savedMsg}</Banner>}
          <div>
            <label className="label">Bio</label>
            <textarea className="input" rows={3} value={profile.bio} onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))} placeholder="Tell potential clients what you do best." />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Trade</label>
              <input className="input" value={profile.trade} onChange={(e) => setProfile((p) => ({ ...p, trade: e.target.value }))} />
            </div>
            <div>
              <label className="label">Location</label>
              <input className="input" value={profile.location} onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">WhatsApp number</label>
            <input className="input" value={profile.whatsapp} onChange={(e) => setProfile((p) => ({ ...p, whatsapp: e.target.value }))} placeholder="07XXXXXXXX" />
          </div>
          <div>
            <label className="label">M-Pesa Till Number (optional)</label>
            <input className="input" value={profile.till_number} onChange={(e) => setProfile((p) => ({ ...p, till_number: e.target.value }))} placeholder="123456" />
            <p className="text-xs mt-1" style={{color:"var(--muted)"}}>Add your M-Pesa Till Number so customers can pay you directly via Lipa Na M-Pesa</p>
          </div>
          <button className="btn-primary">Save changes</button>
        </form>

        <div className="space-y-4">
          <div className="card">
            <h2 className="font-display font-bold text-bark dark:text-sand mb-1">Add a product</h2>
            <p className="text-xs text-muted dark:text-sand/50 mb-3">
              New products show up on your storefront right away, marked "in progress" until you mark them finished.
              Add up to {MAX_PHOTOS} photos per product once it's created, so customers see every angle.
            </p>
            <form onSubmit={addItem} className="space-y-2.5">
              <input className="input" placeholder="Product title" value={newItem.title} onChange={(e) => setNewItem((p) => ({ ...p, title: e.target.value }))} required />
              <input className="input" placeholder="Description (optional)" value={newItem.description} onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2.5">
                <input className="input" type="number" placeholder="Cash price (KES)" value={newItem.cash_price} onChange={(e) => setNewItem((p) => ({ ...p, cash_price: e.target.value }))} />
                <input className="input" type="number" placeholder="Hire purchase price (KES)" value={newItem.hp_price} onChange={(e) => setNewItem((p) => ({ ...p, hp_price: e.target.value }))} />
              </div>
              <p className="text-[11px] text-muted dark:text-sand/40">HP price is usually a little higher than cash, to cover the cost of waiting for full payment.</p>
              <button className="btn-secondary w-full">Add product</button>
            </form>
          </div>

          {items === null ? (
            <Spinner />
          ) : items.length === 0 ? (
            <EmptyState icon="🛠️" title="No products yet" body="Add a piece of work or a product so buyers know what you make." />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {items.map((it) => (
                <ProductCard key={it.id} item={it} onChanged={updateItem} onDeleted={removeItem} />
              ))}
            </div>
          )}
        </div>
      </div>
    </FundiLayout>
  );
}
