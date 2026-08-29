import { useState, useRef } from 'react'
import artianLogo from '@/imports/image.png'
import floralPaintingMain from '@/assets/floral-painting-main.png'
import floralPaintingDetail from '@/assets/floral-painting-detail.png'
import floralPaintingFramed from '@/assets/floral-painting-framed.png'
import floralPaintingProgress from '@/assets/floral-painting-progress.png'

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen =
  | 'home'
  | 'browse'
  | 'product'
  | 'customize-options'
  | 'customize-references'
  | 'customize-review'
  | 'cart'
  | 'checkout'
  | 'confirmation'
  | 'order-status'
  | 'wishlist'
  | 'creators'
  | 'login'
  | 'my-orders'
  | 'creator-dashboard'
  | 'creator-request'
  | 'creator-order'

type UserRole = 'customer' | 'creator'

interface SessionUser {
  role: UserRole
  name: string
  email: string
}

type LoginIntent = 'checkout' | 'my-orders' | null

type CustomWorkflowStatus =
  | 'pending-creator-review'
  | 'modification-requested'
  | 'customer-response-sent'
  | 'in-progress'
  | 'awaiting-customer-review'
  | 'changes-requested'
  | 'progress-approved'
  | 'completed'
  | 'shipped'

interface CustomWorkflow {
  status: CustomWorkflowStatus
  creatorModificationNote?: string
  customerModificationResponse?: string
  customerModificationUploads?: UploadedImage[]
  progressImage?: string
  progressImageName?: string
  progressNote?: string
  customerFeedback?: string
  carrier?: string
  trackingNumber?: string
}

interface UploadedImage {
  key: number
  src: string
  name: string
}

interface CheckoutForm {
  email: string
  name: string
  address1: string
  address2: string
  city: string
  postal: string
  country: string
}

interface SimpleCartItem {
  productId: number
  quantity: number
}

type DeliveryMethod = 'standard' | 'express'

interface CustomizationSnapshot {
  size: string
  material: string
  frame: string
  palette: string
  orientation: string
  uploads: UploadedImage[]
  instruction: string
}

interface OrderItem {
  productId: number
  title: string
  creator: string
  image: string
  quantity: number
  unitPrice: number
  customized: boolean
  customization?: CustomizationSnapshot
  workflow?: CustomWorkflow
}

interface OrderRecord {
  orderNumber: string
  items: OrderItem[]
  subtotal: number
  shipping: number
  total: number
  delivery: DeliveryMethod
  checkout: CheckoutForm
  placedLabel: string
}

interface AppConfig {
  selectedProductId: number
  size: string
  material: string
  frame: string
  palette: string
  orientation: string
  uploads: UploadedImage[]
  instruction: string
  quantity: number
  cartActive: boolean
  simpleCartItems: SimpleCartItem[]
  wishlist: number[]
  checkout: CheckoutForm
  delivery: DeliveryMethod
  orders: OrderRecord[]
  currentOrderNumber: string | null
}

type SetAppConfig = (update: Partial<AppConfig> | ((prev: AppConfig) => Partial<AppConfig>)) => void

// ─── Tokens ───────────────────────────────────────────────────────────────────

const ACCENT = '#2D4A3E'
const SURFACE = '#F5F4F2'
const BORDER = '#D8D3CC'
const INK = '#1A1A1A'
const MUTED = '#6B6560'
const ERROR = '#c0392b'
const PAGE_BG = '#F8F6FA'

// ─── Price engine ─────────────────────────────────────────────────────────────

const SIZE_DELTA: Record<string, number> = {
  '30 × 40 cm': -10, '40 × 50 cm': 0, '50 × 70 cm': 20, '60 × 80 cm': 35,
}
const MATERIAL_DELTA: Record<string, number> = {
  'Stretched Canvas': 0, 'Fine Art Print': -10, 'Mounted Board': -5,
}
const FRAME_DELTA: Record<string, number> = {
  'Natural Wood': 28, 'No Frame': 0, 'Black Wood': 30, 'White Wood': 25,
}
const PALETTE_DELTA: Record<string, number> = {
  Warm: 0, Neutral: 0, Cool: 0, Custom: 10,
}
const ORIENTATION_DELTA: Record<string, number> = {
  Portrait: 0, Landscape: 0, Square: -5,
}
const BASE = 89
const SERVICE_FEE = 17

function calcPrice(cfg: Pick<AppConfig, 'size' | 'material' | 'frame' | 'palette' | 'orientation'>): number {
  return (
    BASE +
    (SIZE_DELTA[cfg.size] ?? 0) +
    (MATERIAL_DELTA[cfg.material] ?? 0) +
    (FRAME_DELTA[cfg.frame] ?? 0) +
    (PALETTE_DELTA[cfg.palette] ?? 0) +
    (ORIENTATION_DELTA[cfg.orientation] ?? 0) +
    SERVICE_FEE
  )
}

function formatPriceAdjustment(value: number): string {
  if (value > 0) return `+€${value}`
  if (value < 0) return `−€${Math.abs(value)}`
  return '€0'
}

const SHIPPING: Record<string, number> = { standard: 8, express: 18 }

// ─── Default state ────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: AppConfig = {
  selectedProductId: 1,
  simpleCartItems: [],
  wishlist: [],
  size: '40 × 50 cm',
  material: 'Stretched Canvas',
  frame: 'Natural Wood',
  palette: 'Warm',
  orientation: 'Portrait',
  uploads: [],
  instruction:
    'Please use the uploaded reference image as the main visual inspiration for the painting. Keep the floral composition recognizable while using a soft, expressive hand-painted style with visible brushwork. Preserve the overall arrangement and character of the flowers, but allow small artistic adjustments to the background, color balance and details where needed. I would prefer a natural, harmonious palette and a painterly finish rather than a photorealistic result.',
  quantity: 1,
  cartActive: false,
  checkout: { email: '', name: '', address1: '', address2: '', city: '', postal: '', country: 'Austria' },
  delivery: 'standard',
  orders: [],
  currentOrderNumber: null,
}

// ─── Product data ─────────────────────────────────────────────────────────────

const PRODUCT_CARDS = [
  { id: 1, title: 'Custom Floral Painting', creator: 'Elena Marsh', price: '€89', priceNum: 89, category: 'Painting', style: 'Botanical', img: floralPaintingMain, tag: 'Popular' },
  { id: 2, title: 'Abstract Landscape Print', creator: 'Tobias Venn', price: '€65', priceNum: 65, category: 'Print', style: 'Abstract', img: 'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=420&h=360&fit=crop&auto=format', tag: undefined },
  { id: 3, title: 'Botanical Watercolor', creator: 'Sara Okonkwo', price: '€74', priceNum: 74, category: 'Watercolor', style: 'Botanical', img: 'https://images.unsplash.com/photo-1750922179530-30508825848c?w=420&h=360&fit=crop&auto=format', tag: 'New' },
  { id: 4, title: 'Portrait Pencil Drawing', creator: 'Marcus Bell', price: '€110', priceNum: 110, category: 'Drawing', style: 'Realistic', img: 'https://images.unsplash.com/photo-1593472807861-5bb884af28f6?w=420&h=360&fit=crop&auto=format', tag: undefined },
  { id: 5, title: 'City Skyline Art Print', creator: 'Yuki Tanaka', price: '€58', priceNum: 58, category: 'Print', style: 'Minimalist', img: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=420&h=360&fit=crop&auto=format', tag: undefined },
  { id: 6, title: 'Dog Portrait Art Print', creator: 'Clara Roth', price: '€99', priceNum: 99, category: 'Print', style: 'Realistic', img: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=420&h=360&fit=crop&auto=format', tag: undefined },
]

// ─── Image constants ──────────────────────────────────────────────────────────

const FLORAL_IMG = floralPaintingMain
const FLORAL_THUMB_1 = floralPaintingMain
const FLORAL_THUMB_2 = floralPaintingDetail
const FLORAL_THUMB_3 = floralPaintingFramed
const CREATOR_IMG = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&auto=format'
const PROGRESS_IMG = floralPaintingProgress

interface ProductDetail {
  mainImgs: string[]
  thumbs: string[]
  creatorImg: string
  description: string
  customizable: string[]
  delivery: string
  isFullFlow: boolean
}

const PRODUCT_DETAILS: Record<number, ProductDetail> = {
  1: {
    mainImgs: [
      floralPaintingMain,
      floralPaintingDetail,
      floralPaintingFramed,
    ],
    thumbs: [FLORAL_THUMB_1, FLORAL_THUMB_2, FLORAL_THUMB_3],
    creatorImg: CREATOR_IMG,
    description: 'A hand-painted floral artwork created using the customer’s reference images as visual guidance. The creator preserves the main composition, character and color relationships of the flowers while allowing small artistic adjustments to the background, balance and details. Each painting is created in an expressive, painterly style rather than as an exact photographic reproduction.',
    customizable: ['Size', 'Material', 'Frame', 'Color palette', 'Orientation', 'Reference images', 'Additional artistic instructions'],
    delivery: '14–21 business days',
    isFullFlow: true,
  },
  2: {
    mainImgs: [
      'https://images.unsplash.com/photo-1598240087583-2f610faf1eaf?w=700&h=860&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1585434111505-8ae42a56f761?w=700&h=860&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=700&h=860&fit=crop&auto=format',
    ],
    thumbs: [
      'https://images.unsplash.com/photo-1598240087583-2f610faf1eaf?w=200&h=250&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1585434111505-8ae42a56f761?w=200&h=250&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=200&h=250&fit=crop&auto=format',
    ],
    creatorImg: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop&auto=format',
    description: 'A bold abstract landscape print built from layered color fields inspired by mountains, coastlines and open terrain. Printed on archival fine art paper, this catalog piece brings Tobias Venn’s expressive original painting into a ready-to-order format.',
    customizable: [],
    delivery: '10–16 business days',
    isFullFlow: false,
  },
  3: {
    mainImgs: [
      'https://images.unsplash.com/photo-1750922179530-30508825848c?w=700&h=860&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1750265451971-25a57efe0f86?w=700&h=860&fit=crop&auto=format',
    ],
    thumbs: [
      'https://images.unsplash.com/photo-1750922179530-30508825848c?w=200&h=250&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1750265451971-25a57efe0f86?w=200&h=250&fit=crop&auto=format',
    ],
    creatorImg: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&h=80&fit=crop&auto=format',
    description: 'A delicate botanical watercolor featuring flowers and foliage in transparent layers of pigment. Sara Okonkwo’s refined naturalist study is offered as a standard catalog artwork on heavyweight cotton paper.',
    customizable: [],
    delivery: '12–18 business days',
    isFullFlow: false,
  },
  4: {
    mainImgs: [
      'https://images.unsplash.com/photo-1593472807861-5bb884af28f6?w=700&h=860&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1582201957417-24546f2e643d?w=700&h=860&fit=crop&auto=format',
    ],
    thumbs: [
      'https://images.unsplash.com/photo-1593472807861-5bb884af28f6?w=200&h=250&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1582201957417-24546f2e643d?w=200&h=250&fit=crop&auto=format',
    ],
    creatorImg: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format',
    description: 'A hand-drawn graphite portrait study with soft tonal transitions and expressive pencil work. The piece focuses on facial expression, gaze and natural shading, presented as an original drawing on quality art paper.',
    customizable: [],
    delivery: '16–22 business days',
    isFullFlow: false,
  },
  5: {
    mainImgs: [
      'https://images.unsplash.com/photo-1546447208-9d7b923c0204?w=700&h=860&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=700&h=860&fit=crop&auto=format',
    ],
    thumbs: [
      'https://images.unsplash.com/photo-1546447208-9d7b923c0204?w=200&h=250&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=200&h=250&fit=crop&auto=format',
    ],
    creatorImg: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&auto=format',
    description: 'A crisp city skyline image presented as a minimalist art print for home or office. Yuki Tanaka’s architectural composition emphasizes the city’s scale, rhythm and silhouette in a ready-to-order format.',
    customizable: [],
    delivery: '8–14 business days',
    isFullFlow: false,
  },
  6: {
    mainImgs: [
      'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=700&h=860&fit=crop&auto=format',
    ],
    thumbs: [
      'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=200&h=250&fit=crop&auto=format',
    ],
    creatorImg: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=80&h=80&fit=crop&auto=format',
    description: 'An expressive dog portrait offered as a gallery-quality art print. The standard catalog piece focuses on the dog’s lively expression, natural coloring and familiar character without requiring customer reference images.',
    customizable: [],
    delivery: '18–24 business days',
    isFullFlow: false,
  },
}

function getCartItems(cfg: AppConfig): OrderItem[] {
  const items: OrderItem[] = []
  const customProduct = PRODUCT_CARDS[0]

  if (cfg.cartActive) {
    items.push({
      productId: customProduct.id,
      title: customProduct.title,
      creator: customProduct.creator,
      image: FLORAL_THUMB_1,
      quantity: cfg.quantity,
      unitPrice: calcPrice(cfg),
      customized: true,
      customization: {
        size: cfg.size,
        material: cfg.material,
        frame: cfg.frame,
        palette: cfg.palette,
        orientation: cfg.orientation,
        uploads: cfg.uploads.map((upload) => ({ ...upload })),
        instruction: cfg.instruction,
      },
    })
  }

  cfg.simpleCartItems.forEach((cartItem) => {
    const product = PRODUCT_CARDS.find((candidate) => candidate.id === cartItem.productId)
    const detail = PRODUCT_DETAILS[cartItem.productId]
    if (!product || !detail) return
    items.push({
      productId: product.id,
      title: product.title,
      creator: product.creator,
      image: detail.thumbs[0],
      quantity: cartItem.quantity,
      unitPrice: product.priceNum,
      customized: false,
    })
  })

  return items
}

function getItemsSubtotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
}

function getCustomizationLabel(item: OrderItem): string {
  const custom = item.customization
  return custom ? `${custom.size} · ${custom.material} · ${custom.frame} · ${custom.palette} · ${custom.orientation}` : ''
}

const WORKFLOW_LABELS: Record<CustomWorkflowStatus, string> = {
  'pending-creator-review': 'Pending Creator Review',
  'modification-requested': 'Modification Requested',
  'customer-response-sent': 'Response Sent',
  'in-progress': 'In Progress',
  'awaiting-customer-review': 'Awaiting Review',
  'changes-requested': 'Changes Requested',
  'progress-approved': 'Progress Approved',
  completed: 'Artwork Completed',
  shipped: 'Shipped',
}

const INCOMING_WORKFLOW_STATUSES: CustomWorkflowStatus[] = ['pending-creator-review', 'modification-requested', 'customer-response-sent']
const ACTIVE_WORKFLOW_STATUSES: CustomWorkflowStatus[] = ['in-progress', 'awaiting-customer-review', 'changes-requested', 'progress-approved', 'completed', 'shipped']

function isElenaCustomizedItem(item: OrderItem): boolean {
  return item.creator === 'Elena Marsh' && item.customized && Boolean(item.customization)
}

function getCustomWorkflow(item: OrderItem): CustomWorkflow {
  return item.workflow ?? { status: 'pending-creator-review' }
}

function getOrderDisplayStatus(order: OrderRecord): string {
  const customItem = order.items.find((item) => item.customized && item.customization)
  return customItem ? WORKFLOW_LABELS[getCustomWorkflow(customItem).status] : 'Order Confirmed'
}

function getWorkflowTone(status: CustomWorkflowStatus): { bg: string; color: string; border: string } {
  if (status === 'pending-creator-review' || status === 'awaiting-customer-review' || status === 'modification-requested' || status === 'customer-response-sent') {
    return { bg: '#fef8e7', color: '#8a6800', border: '#e8d98a' }
  }
  if (status === 'changes-requested') return { bg: '#fdf0ef', color: ERROR, border: '#e8b4b0' }
  if (status === 'in-progress' || status === 'progress-approved') return { bg: '#edf2ff', color: '#3b5bdb', border: '#bac8ff' }
  return { bg: '#e8f0ec', color: ACCENT, border: '#b2d0c4' }
}

interface CreatorTask {
  order: OrderRecord
  item: OrderItem
}

function getElenaTasks(orders: OrderRecord[]): CreatorTask[] {
  return orders.flatMap((order) => order.items.filter(isElenaCustomizedItem).map((item) => ({ order, item })))
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function PrimaryBtn({ children, onClick, fullWidth, small, disabled }: { children: React.ReactNode; onClick?: () => void; fullWidth?: boolean; small?: boolean; disabled?: boolean }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: disabled ? '#a0b5ae' : hover ? '#1e3329' : ACCENT,
        color: '#fff', border: 'none', borderRadius: 6,
        padding: small ? '8px 16px' : '12px 24px',
        fontSize: small ? 13 : 14, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        width: fullWidth ? '100%' : undefined,
        transition: 'background 0.15s', letterSpacing: '0.1px',
      }}
    >{children}</button>
  )
}

function SecondaryBtn({ children, onClick, fullWidth, small }: { children: React.ReactNode; onClick?: () => void; fullWidth?: boolean; small?: boolean }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? SURFACE : '#fff', color: INK,
        border: `1px solid ${BORDER}`, borderRadius: 6,
        padding: small ? '8px 16px' : '12px 24px',
        fontSize: small ? 13 : 14, fontWeight: 500,
        cursor: 'pointer', width: fullWidth ? '100%' : undefined,
        transition: 'background 0.15s',
      }}
    >{children}</button>
  )
}

function OptionBtn({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: `1.5px solid ${selected ? ACCENT : BORDER}`,
        background: selected ? '#e8f0ec' : '#fff',
        color: selected ? ACCENT : INK,
        borderRadius: 6, padding: '8px 14px',
        fontSize: 13, fontWeight: selected ? 600 : 400,
        cursor: 'pointer', transition: 'all 0.12s',
      }}
    >{label}</button>
  )
}

function CheckIcon({ size = 16, color = '#fff' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} fill="none" stroke={color} strokeWidth={2.5} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
}

function CartIcon() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>
}

function HeartIcon({ filled }: { filled?: boolean }) {
  return <svg width="20" height="20" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
}

function AccountIcon() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
}

function ChevronRight({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
}

function EditIcon() {
  return <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
}

function XIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
}

function UploadIcon() {
  return <svg width="24" height="24" fill="none" stroke={MUTED} strokeWidth={1.5} viewBox="0 0 24 24"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" /></svg>
}

function Breadcrumb({ items, onNavigate }: { items: { label: string; screen?: Screen }[]; onNavigate: (s: Screen) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: MUTED }}>
      {items.map((item, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {i > 0 && <ChevronRight size={12} />}
          {item.screen ? (
            <button onClick={() => onNavigate(item.screen!)} style={{ background: 'none', border: 'none', color: i === items.length - 1 ? INK : MUTED, fontWeight: i === items.length - 1 ? 500 : 400, cursor: 'pointer', fontSize: 13, padding: 0 }}>
              {item.label}
            </button>
          ) : (
            <span style={{ color: i === items.length - 1 ? INK : MUTED, fontWeight: i === items.length - 1 ? 500 : 400 }}>{item.label}</span>
          )}
        </span>
      ))}
    </div>
  )
}

function ProgressSteps({ steps, active }: { steps: string[]; active: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36 }}>
      {steps.map((step, i) => {
        const done = i < active
        const current = i === active
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: done ? ACCENT : current ? ACCENT : 'transparent', border: done || current ? `2px solid ${ACCENT}` : `2px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {done ? <CheckIcon size={12} /> : <span style={{ fontSize: 11, fontWeight: 600, color: current ? '#fff' : MUTED }}>{i + 1}</span>}
              </div>
              <span style={{ fontSize: 13, fontWeight: current ? 600 : 400, color: done || current ? INK : MUTED, whiteSpace: 'nowrap' }}>{step}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 1, background: done ? ACCENT : BORDER, margin: '0 12px', minWidth: 32 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function ConfigSection({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ marginBottom: last ? 0 : 28, paddingBottom: last ? 0 : 28, borderBottom: last ? 'none' : `1px solid ${BORDER}` }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: INK, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
      {children}
    </div>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({ screen, cartCount, wishlistCount, session, onLogout, onNavigate }: { screen: Screen; cartCount: number; wishlistCount: number; session: SessionUser | null; onLogout: () => void; onNavigate: (s: Screen) => void }) {
  const [accountOpen, setAccountOpen] = useState(false)
  const isCreator = session?.role === 'creator'
  const navLink = (label: string, target: Screen) => (
    <button
      onClick={() => onNavigate(target)}
      style={{ fontSize: 14, color: screen === target ? ACCENT : MUTED, fontWeight: screen === target ? 600 : 400, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', borderBottom: screen === target ? `1.5px solid ${ACCENT}` : '1.5px solid transparent', transition: 'color 0.15s' }}
    >{label}</button>
  )
  return (
    <header style={{ borderBottom: `1px solid ${BORDER}`, background: '#fff', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px', height: 64, display: 'flex', alignItems: 'center', gap: 40 }}>
        <button aria-label={isCreator ? 'Go to Creator Dashboard' : 'Go to Homepage'} onClick={() => onNavigate(isCreator ? 'creator-dashboard' : 'home')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
          <img src={artianLogo} alt="Artian" style={{ height: 40, width: 'auto', objectFit: 'contain', display: 'block' }} />
        </button>
        <nav style={{ display: 'flex', gap: 28, marginLeft: 8 }}>
          {navLink('Browse Products', 'browse')}
          {isCreator ? navLink('Creator Dashboard', 'creator-dashboard') : (
            <>
              {navLink('Creators', 'creators')}
              {navLink('My Orders', 'my-orders')}
            </>
          )}
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 20 }}>
          {!isCreator && (
            <>
              <button
                aria-label="Open Wishlist"
                onClick={() => onNavigate('wishlist')}
                style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: screen === 'wishlist' ? ACCENT : INK, transition: 'color 0.15s' }}
              >
                <HeartIcon filled={wishlistCount > 0} />
                {wishlistCount > 0 && (
                  <span style={{ position: 'absolute', top: -2, right: -4, background: ACCENT, color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>{wishlistCount}</span>
                )}
              </button>
              <button aria-label={`Open Cart${cartCount > 0 ? ` (${cartCount} items)` : ''}`} onClick={() => onNavigate('cart')} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: INK }}>
                <CartIcon />
                {cartCount > 0 && (
                  <span style={{ position: 'absolute', top: -2, right: -4, background: ACCENT, color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>{cartCount}</span>
                )}
              </button>
            </>
          )}
          {/* Account button with dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              aria-label={session ? 'Open Account Menu' : 'Open Account'}
              onClick={() => setAccountOpen((v) => !v)}
              style={{ background: session ? ACCENT : 'none', border: 'none', borderRadius: '50%', cursor: 'pointer', padding: session ? 0 : 4, width: session ? 32 : 'auto', height: session ? 32 : 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: session ? '#fff' : INK }}
            >
              {session ? <span style={{ fontSize: 13, fontWeight: 700 }}>{session.name.charAt(0)}</span> : <AccountIcon />}
            </button>
            {accountOpen && (
              <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', minWidth: 200, overflow: 'hidden', zIndex: 100 }}>
                {session ? (
                  <>
                    <div style={{ padding: '14px 16px', borderBottom: `1px solid ${BORDER}` }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{session.name}</div>
                      <div style={{ fontSize: 12, color: MUTED }}>{session.email}</div>
                    </div>
                    <button onClick={() => { onNavigate(isCreator ? 'creator-dashboard' : 'my-orders'); setAccountOpen(false) }} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', fontSize: 13, color: INK, background: 'none', border: 'none', cursor: 'pointer', borderBottom: `1px solid ${BORDER}` }}>{isCreator ? 'Creator Dashboard' : 'My Orders'}</button>
                    <button onClick={() => { onLogout(); setAccountOpen(false) }} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', fontSize: 13, color: ERROR, background: 'none', border: 'none', cursor: 'pointer' }}>Log Out</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { onNavigate('login'); setAccountOpen(false) }} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', fontSize: 13, color: INK, background: 'none', border: 'none', cursor: 'pointer' }}>Log In</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

// ─── Screen: Home ─────────────────────────────────────────────────────────────

function HomeScreen({ onNavigate, onSelectProduct }: { onNavigate: (s: Screen) => void; onSelectProduct: (id: number) => void }) {
  const featuredProducts = PRODUCT_CARDS.filter((product) => [1, 3, 4, 6].includes(product.id))
  const featuredCreators = CREATORS.slice(0, 3)
  const customizationSteps = [
    ['Choose a product', 'Browse artwork and select a product that supports customization.'],
    ['Share your preferences', 'Select available options, upload reference images, and add instructions for the creator.'],
    ['Review and follow your order', 'Confirm the configuration before checkout and follow the order as the creator works on it.'],
  ]

  return (
    <main>
      <section aria-labelledby="home-hero-heading" style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 40px 0' }}>
        <div className="home-hero-grid" style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden', display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', minHeight: 500 }}>
          <div style={{ padding: '68px 60px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start' }}>
            <div style={{ fontSize: 11, color: ACCENT, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: 18 }}>Customized art marketplace</div>
            <h1 id="home-hero-heading" style={{ fontSize: 54, lineHeight: 1.06, fontWeight: 700, letterSpacing: '-1.8px', color: INK, margin: '0 0 22px', maxWidth: 460 }}>Art made personal.</h1>
            <p style={{ fontSize: 16, lineHeight: 1.75, color: MUTED, margin: '0 0 32px', maxWidth: 500 }}>Discover original artwork and create customized pieces shaped around your ideas, preferences, and reference images.</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <PrimaryBtn onClick={() => onNavigate('browse')}>Browse Products</PrimaryBtn>
              <SecondaryBtn onClick={() => onNavigate('creators')}>Explore Creators</SecondaryBtn>
            </div>
          </div>
          <div style={{ position: 'relative', background: '#ece8ee', padding: '34px', display: 'flex', alignItems: 'stretch' }}>
            <img src={floralPaintingFramed} alt="Framed floral artwork displayed in a calm interior" style={{ width: '100%', minHeight: 420, objectFit: 'cover', display: 'block', borderRadius: 8 }} />
            <div style={{ position: 'absolute', left: 52, right: 52, bottom: 52, background: 'rgba(255,255,255,0.94)', border: '1px solid rgba(216,211,204,0.9)', borderRadius: 6, padding: '12px 15px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: INK, marginBottom: 2 }}>Original work, shaped around you</div>
              <div style={{ fontSize: 11, color: MUTED }}>Explore artwork with creator-led customization options.</div>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="featured-art-heading" style={{ maxWidth: 1200, margin: '0 auto', padding: '76px 40px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 11, color: ACCENT, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 9 }}>Selected work</div>
            <h2 id="featured-art-heading" style={{ fontSize: 30, lineHeight: 1.2, color: INK, letterSpacing: '-0.6px', margin: 0 }}>Featured Customized Art</h2>
          </div>
          <button onClick={() => onNavigate('browse')} style={{ border: 'none', background: 'none', color: ACCENT, padding: '6px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>View all products →</button>
        </div>
        <div className="home-product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 22 }}>
          {featuredProducts.map((product) => <ProductCard key={product.id} product={product} onNavigate={onNavigate} onSelect={onSelectProduct} />)}
        </div>
      </section>

      <section aria-labelledby="customization-works-heading" style={{ maxWidth: 1200, margin: '0 auto', padding: '88px 40px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 34 }}>
          <div style={{ fontSize: 11, color: ACCENT, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 9 }}>A clear, guided process</div>
          <h2 id="customization-works-heading" style={{ fontSize: 30, lineHeight: 1.2, color: INK, letterSpacing: '-0.6px', margin: '0 0 12px' }}>How customization works</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: MUTED, maxWidth: 560, margin: '0 auto' }}>Choose the work that speaks to you, share what matters, and stay connected to the creator’s progress.</p>
        </div>
        <div className="home-steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
          {customizationSteps.map(([title, description], index) => (
            <div key={title} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '28px 26px 30px' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#e8f0ec', color: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, marginBottom: 20 }}>{index + 1}</div>
              <h3 style={{ fontSize: 16, color: INK, margin: '0 0 9px' }}>{title}</h3>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: MUTED, margin: 0 }}>{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="meet-creators-heading" style={{ maxWidth: 1200, margin: '0 auto', padding: '88px 40px 0' }}>
        <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '44px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 28, marginBottom: 30 }}>
            <div>
              <h2 id="meet-creators-heading" style={{ fontSize: 30, lineHeight: 1.2, color: INK, letterSpacing: '-0.6px', margin: '0 0 10px' }}>Meet the Creators</h2>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: MUTED, maxWidth: 610, margin: 0 }}>Explore artists with different styles and specialties and discover the work available through Artian.</p>
            </div>
            <SecondaryBtn onClick={() => onNavigate('creators')}>Explore Creators</SecondaryBtn>
          </div>
          <div className="home-creators-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            {featuredCreators.map((creator) => (
              <div key={creator.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden', background: PAGE_BG }}>
                <img src={creator.studioImg} alt={`${creator.name}'s ${creator.specialty.toLowerCase()} work`} style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }} />
                <div style={{ padding: '17px 18px 19px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img src={creator.avatar} alt="" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${BORDER}`, flexShrink: 0 }} />
                  <div><div style={{ fontSize: 14, fontWeight: 700, color: INK, marginBottom: 3 }}>{creator.name}</div><div style={{ fontSize: 12, color: MUTED }}>{creator.specialty}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="home-final-cta" style={{ maxWidth: 1200, margin: '0 auto', padding: '88px 40px 80px' }}>
        <div style={{ background: ACCENT, borderRadius: 10, padding: '54px 40px', textAlign: 'center' }}>
          <h2 id="home-final-cta" style={{ fontSize: 28, color: '#fff', letterSpacing: '-0.4px', margin: '0 0 22px' }}>Find something worth making your own.</h2>
          <button onClick={() => onNavigate('browse')} style={{ border: '1px solid rgba(255,255,255,0.8)', borderRadius: 6, padding: '11px 20px', background: '#fff', color: ACCENT, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Browse Customized Art</button>
        </div>
      </section>
    </main>
  )
}

// ─── Screen 1: Browse ─────────────────────────────────────────────────────────

function BrowseScreen({ onNavigate, onSelectProduct }: { onNavigate: (s: Screen) => void; onSelectProduct: (id: number) => void }) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeStyle, setActiveStyle] = useState('All')
  const [activePrice, setActivePrice] = useState('All')

  const categories = ['All', 'Painting', 'Print', 'Watercolor', 'Drawing', 'Illustration']
  const styles = ['All', 'Realistic', 'Abstract', 'Botanical', 'Minimalist']
  const prices = ['All', 'Under €70', '€70–€100', 'Over €100']

  const filtered = PRODUCT_CARDS.filter((p) => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.title.toLowerCase().includes(q) || p.creator.toLowerCase().includes(q)
    const matchCat = activeCategory === 'All' || p.category === activeCategory
    const matchStyle = activeStyle === 'All' || p.style === activeStyle
    const matchPrice =
      activePrice === 'All' ||
      (activePrice === 'Under €70' && p.priceNum < 70) ||
      (activePrice === '€70–€100' && p.priceNum >= 70 && p.priceNum <= 100) ||
      (activePrice === 'Over €100' && p.priceNum > 100)
    return matchSearch && matchCat && matchStyle && matchPrice
  })

  const clearFilters = () => { setSearch(''); setActiveCategory('All'); setActiveStyle('All'); setActivePrice('All') }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '52px 40px 80px' }}>
      <div style={{ marginBottom: 48 }}>
        <h1 style={{ fontSize: 36, fontWeight: 700, color: INK, letterSpacing: '-0.5px', marginBottom: 12 }}>Discover Customized Art</h1>
        <p style={{ fontSize: 15, color: MUTED, maxWidth: 520, lineHeight: 1.6 }}>Find original artwork made to your exact specifications — every piece shaped by your vision and brought to life by independent creators.</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 40, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220 }}>
          <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} width="16" height="16" fill="none" stroke={MUTED} strokeWidth={1.8} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products or creators…" style={{ width: '100%', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '10px 12px 10px 36px', fontSize: 14, color: INK, background: '#fff', boxSizing: 'border-box' }} />
        </div>
        <FilterGroup label="Category" options={categories} active={activeCategory} onChange={setActiveCategory} />
        <FilterGroup label="Style" options={styles} active={activeStyle} onChange={setActiveStyle} />
        <FilterGroup label="Price" options={prices} active={activePrice} onChange={setActivePrice} />
      </div>

      <p style={{ fontSize: 13, color: MUTED, marginBottom: 24 }}>{filtered.length} product{filtered.length !== 1 ? 's' : ''} found</p>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <p style={{ fontSize: 15, color: MUTED, marginBottom: 20 }}>No products found matching your filters.</p>
          <SecondaryBtn onClick={clearFilters}>Clear all filters</SecondaryBtn>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28 }}>
          {filtered.map((p) => <ProductCard key={p.id} product={p} onNavigate={onNavigate} onSelect={onSelectProduct} />)}
        </div>
      )}
    </div>
  )
}

function FilterGroup({ label, options, active, onChange }: { label: string; options: string[]; active: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, color: MUTED, fontWeight: 500, letterSpacing: '0.3px', textTransform: 'uppercase' }}>{label}</label>
      <select value={active} onChange={(e) => onChange(e.target.value)} style={{ border: `1px solid ${BORDER}`, borderRadius: 6, padding: '9px 32px 9px 12px', fontSize: 13, color: INK, background: '#fff', cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%236B6560' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  )
}

function ProductCard({ product, onNavigate, onSelect }: { product: typeof PRODUCT_CARDS[0]; onNavigate: (s: Screen) => void; onSelect: (id: number) => void }) {
  const [hover, setHover] = useState(false)
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={() => { onSelect(product.id); onNavigate('product') }} style={{ border: `1px solid ${hover ? '#bfb9b1' : BORDER}`, borderRadius: 8, overflow: 'hidden', background: '#fff', cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s', boxShadow: hover ? '0 4px 16px rgba(0,0,0,0.07)' : 'none' }}>
      <div style={{ position: 'relative', overflow: 'hidden', background: SURFACE }}>
        <img src={product.img} alt={product.title} style={{ width: '100%', height: 240, objectFit: 'cover', display: 'block', transform: hover ? 'scale(1.03)' : 'scale(1)', transition: 'transform 0.3s ease' }} />
        {product.tag && <span style={{ position: 'absolute', top: 12, left: 12, background: ACCENT, color: '#fff', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4 }}>{product.tag}</span>}
        {PRODUCT_DETAILS[product.id]?.isFullFlow && (
          <span style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.9)', color: ACCENT, fontSize: 10, fontWeight: 600, padding: '3px 7px', borderRadius: 4, letterSpacing: '0.3px', textTransform: 'uppercase' }}>Customizable</span>
        )}
      </div>
      <div style={{ padding: '16px 18px 20px' }}>
        <div style={{ fontSize: 11, color: MUTED, marginBottom: 6, fontWeight: 500, letterSpacing: '0.3px', textTransform: 'uppercase' }}>{product.category}</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 4 }}>{product.title}</div>
        <div style={{ fontSize: 13, color: MUTED, marginBottom: 12 }}>by {product.creator}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: INK }}>{PRODUCT_DETAILS[product.id]?.isFullFlow ? `From ${product.price}` : product.price}</span>
          <span style={{ fontSize: 12, color: ACCENT, fontWeight: 500 }}>View product →</span>
        </div>
      </div>
    </div>
  )
}

// ─── Screen 2: Product Details ────────────────────────────────────────────────

function ProductScreen({ cfg, setCfg, onNavigate }: { cfg: AppConfig; setCfg: SetAppConfig; onNavigate: (s: Screen) => void }) {
  const [activeThumb, setActiveThumb] = useState(0)
  const [addedToCart, setAddedToCart] = useState(false)

  const product = PRODUCT_CARDS.find((p) => p.id === cfg.selectedProductId) ?? PRODUCT_CARDS[0]
  const detail = PRODUCT_DETAILS[product.id] ?? PRODUCT_DETAILS[1]
  const wishlisted = cfg.wishlist.includes(product.id)

  const toggleWishlist = () => {
    const next = wishlisted
      ? cfg.wishlist.filter((id) => id !== product.id)
      : [...cfg.wishlist, product.id]
    setCfg({ wishlist: next })
  }

  const handleAddToCart = () => {
    const existing = cfg.simpleCartItems.find((i) => i.productId === product.id)
    const updated = existing
      ? cfg.simpleCartItems.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      : [...cfg.simpleCartItems, { productId: product.id, quantity: 1 }]
    setCfg({ simpleCartItems: updated })
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 40px 80px' }}>
      <div style={{ marginBottom: 28 }}>
        <Breadcrumb items={[{ label: 'Browse Products', screen: 'browse' }, { label: product.category }, { label: product.title }]} onNavigate={onNavigate} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64 }}>
        {/* Gallery */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {detail.thumbs.map((src, i) => (
              <button key={i} onClick={() => setActiveThumb(i)} style={{ width: 72, height: 90, border: `2px solid ${i === activeThumb ? ACCENT : BORDER}`, borderRadius: 5, overflow: 'hidden', padding: 0, cursor: 'pointer', background: SURFACE, flexShrink: 0, transition: 'border-color 0.15s' }}>
                <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </button>
            ))}
          </div>
          <div style={{ flex: 1, borderRadius: 8, overflow: 'hidden', background: SURFACE }}>
            <img src={detail.mainImgs[activeThumb]} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        </div>

        {/* Info */}
        <div>
          <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, color: ACCENT, border: `1px solid ${ACCENT}`, padding: '3px 9px', borderRadius: 4, marginBottom: 16, letterSpacing: '0.3px', textTransform: 'uppercase' }}>{product.category}</span>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: INK, letterSpacing: '-0.3px', marginBottom: 8 }}>{product.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <img src={detail.creatorImg} alt={product.creator} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
            <span style={{ fontSize: 13, color: MUTED }}>by</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: INK }}>{product.creator}</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: INK, marginBottom: 24 }}>{detail.isFullFlow ? `From ${product.price}` : product.price}</div>
          <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.7, marginBottom: 28, borderBottom: `1px solid ${BORDER}`, paddingBottom: 28 }}>{detail.description}</p>

          {detail.isFullFlow && (
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: INK, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.4px' }}>What you can customize</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {detail.customizable.map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: MUTED }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#e8f0ec', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CheckIcon size={10} color={ACCENT} /></span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ background: SURFACE, borderRadius: 6, padding: '12px 16px', fontSize: 13, color: MUTED, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" fill="none" stroke={MUTED} strokeWidth={1.6} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            Estimated delivery: <strong style={{ color: INK }}>{detail.delivery}</strong>{detail.isFullFlow ? ' after approval' : ''}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {detail.isFullFlow ? (
                <PrimaryBtn onClick={() => onNavigate('customize-options')}>Customize Product</PrimaryBtn>
              ) : (
                <PrimaryBtn onClick={handleAddToCart}>
                  {addedToCart ? '✓ Added to Cart' : 'Add to Cart'}
                </PrimaryBtn>
              )}
              <SecondaryBtn onClick={toggleWishlist}>
                {wishlisted ? '♥ Saved to Wishlist' : '♡ Save to Wishlist'}
              </SecondaryBtn>
            </div>
            {addedToCart && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: ACCENT, fontWeight: 500 }}>Added to your cart.</span>
                <button onClick={() => onNavigate('cart')} style={{ background: 'none', border: 'none', fontSize: 13, color: ACCENT, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>View cart →</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Screen 3: Customize — Options ───────────────────────────────────────────

const STEPS = ['Product', 'Options', 'References', 'Review']

function CustomizeOptionsScreen({ cfg, setCfg, onNavigate }: { cfg: AppConfig; setCfg: SetAppConfig; onNavigate: (s: Screen) => void }) {
  const price = calcPrice(cfg)

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 40px 80px' }}>
      <div style={{ marginBottom: 28 }}>
        <Breadcrumb items={[{ label: 'Browse Products', screen: 'browse' }, { label: 'Custom Floral Painting', screen: 'product' }, { label: 'Customize' }]} onNavigate={onNavigate} />
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: INK, marginBottom: 32, letterSpacing: '-0.3px' }}>Customize Your Product</h1>
      <ProgressSteps steps={STEPS} active={1} />

      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 56 }}>
        <div>
          <div style={{ borderRadius: 8, overflow: 'hidden', background: SURFACE, marginBottom: 16, border: `1px solid ${BORDER}` }}>
            <img src={FLORAL_IMG} alt="Custom Floral Painting preview" style={{ width: '100%', height: 480, objectFit: 'cover', display: 'block' }} />
          </div>
          <div style={{ background: SURFACE, borderRadius: 6, padding: '14px 16px', fontSize: 13 }}>
            {[['Size', cfg.size], ['Material', cfg.material], ['Frame', cfg.frame], ['Palette', cfg.palette], ['Orientation', cfg.orientation]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: MUTED }}>{k}</span>
                <span style={{ color: INK, fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <ConfigSection label="Size">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['40 × 50 cm', '30 × 40 cm', '50 × 70 cm', '60 × 80 cm'].map((s) => <OptionBtn key={s} label={s} selected={cfg.size === s} onClick={() => setCfg({ size: s })} />)}
            </div>
          </ConfigSection>
          <ConfigSection label="Material">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['Stretched Canvas', 'Fine Art Print', 'Mounted Board'].map((s) => <OptionBtn key={s} label={s} selected={cfg.material === s} onClick={() => setCfg({ material: s })} />)}
            </div>
          </ConfigSection>
          <ConfigSection label="Frame">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['Natural Wood', 'No Frame', 'Black Wood', 'White Wood'].map((s) => <OptionBtn key={s} label={s} selected={cfg.frame === s} onClick={() => setCfg({ frame: s })} />)}
            </div>
          </ConfigSection>
          <ConfigSection label="Color Palette">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['Warm', 'Neutral', 'Cool', 'Custom'].map((s) => <OptionBtn key={s} label={s} selected={cfg.palette === s} onClick={() => setCfg({ palette: s })} />)}
            </div>
          </ConfigSection>
          <ConfigSection label="Orientation" last>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['Portrait', 'Landscape', 'Square'].map((s) => <OptionBtn key={s} label={s} selected={cfg.orientation === s} onClick={() => setCfg({ orientation: s })} />)}
            </div>
          </ConfigSection>

          <div style={{ marginTop: 32, padding: '20px 0 0', borderTop: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, color: MUTED, marginBottom: 2 }}>Estimated price</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: INK }}>€{price}</div>
              <div style={{ fontSize: 12, color: MUTED }}>
                Includes selected options and creator service fee
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <SecondaryBtn onClick={() => onNavigate('product')}>Back</SecondaryBtn>
              <PrimaryBtn onClick={() => onNavigate('customize-references')}>Continue</PrimaryBtn>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Screen 4: References & Instructions ─────────────────────────────────────

function CustomizeReferencesScreen({ cfg, setCfg, onNavigate }: { cfg: AppConfig; setCfg: SetAppConfig; onNavigate: (s: Screen) => void }) {
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const keyRef = useRef(Math.max(100, ...cfg.uploads.map((upload) => upload.key + 1)))
  const fileInputRef = useRef<HTMLInputElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)

  const price = calcPrice(cfg)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (selectedFiles.length === 0) return

    const remaining = Math.max(0, 4 - cfg.uploads.length)
    const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
    const unsupported = selectedFiles.filter((file) => !acceptedTypes.has(file.type))
    const oversized = selectedFiles.filter((file) => acceptedTypes.has(file.type) && file.size > 10 * 1024 * 1024)
    const validFiles = selectedFiles.filter((file) => acceptedTypes.has(file.type) && file.size <= 10 * 1024 * 1024)
    const filesToRead = validFiles.slice(0, remaining)
    const messages: string[] = []

    if (unsupported.length > 0) messages.push('Only JPG, PNG, and WebP images can be added.')
    if (oversized.length > 0) messages.push(`${oversized.length} file${oversized.length === 1 ? '' : 's'} exceeded 10 MB and ${oversized.length === 1 ? 'was' : 'were'} not added.`)
    if (validFiles.length > remaining) messages.push(`Only ${remaining} more image${remaining === 1 ? '' : 's'} could be added because the maximum is 4.`)

    const loadedImages = (await Promise.all(filesToRead.map((file) => new Promise<UploadedImage | null>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve({ key: keyRef.current++, src: reader.result as string, name: file.name })
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(file)
    })))).filter((image): image is UploadedImage => image !== null)

    if (loadedImages.length > 0) {
      setCfg((prev) => ({ uploads: [...prev.uploads, ...loadedImages].slice(0, 4) }))
      setUploadError(null)
    }
    if (loadedImages.length < filesToRead.length) messages.push('One or more images could not be read and were not added.')
    setFileError(messages.length > 0 ? messages.join(' ') : null)
  }

  const removeUpload = (key: number) => {
    setCfg((prev) => ({ uploads: prev.uploads.filter((u) => u.key !== key) }))
  }

  const handleContinue = () => {
    if (cfg.uploads.length === 0) {
      setUploadError('Please upload at least one floral reference image before continuing.')
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    onNavigate('customize-review')
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 40px 80px' }}>
      <div style={{ marginBottom: 28 }}>
        <Breadcrumb items={[{ label: 'Browse Products', screen: 'browse' }, { label: 'Custom Floral Painting', screen: 'product' }, { label: 'Customize' }]} onNavigate={onNavigate} />
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: INK, marginBottom: 32, letterSpacing: '-0.3px' }}>Customize Your Product</h1>
      <ProgressSteps steps={STEPS} active={2} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 56 }}>
        <div>
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: INK, marginBottom: 6 }}>Reference Images</h3>
            <p style={{ fontSize: 13, color: MUTED, marginBottom: 16, lineHeight: 1.6 }}>Upload one or more reference images that show the floral composition, colors, arrangement or painting style you would like the creator to follow. The reference image is used as visual guidance and does not need to be reproduced exactly.</p>

            <div ref={errorRef}>
              {uploadError && (
                <div style={{ background: '#fdf0ef', border: `1px solid #e8b4b0`, borderRadius: 6, padding: '10px 14px', fontSize: 13, color: ERROR, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="14" height="14" fill="none" stroke={ERROR} strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  {uploadError}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              {cfg.uploads.map((item, idx) => (
                <div key={item.key} style={{ position: 'relative', width: 120, height: 120, borderRadius: 6, overflow: 'visible', border: `1px solid ${BORDER}` }}>
                  <img src={item.src} alt={`Reference ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 6 }} />
                  <button onClick={() => removeUpload(item.key)} style={{ position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: '50%', background: '#fff', border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', color: MUTED }}>
                    <XIcon size={10} />
                  </button>
                  <div style={{ fontSize: 10, color: MUTED, textAlign: 'center', marginTop: 5 }}>Photo {idx + 1}</div>
                </div>
              ))}

              {cfg.uploads.length < 4 && (
                <label style={{ width: 120, height: 120, border: `1.5px dashed ${uploadError ? ERROR : BORDER}`, borderRadius: 6, background: uploadError ? '#fdf0ef' : SURFACE, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: MUTED, fontSize: 12 }}>
                  <UploadIcon />
                  Add photo
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" multiple style={{ display: 'none' }} onChange={handleFileChange} />
                </label>
              )}
            </div>
            <p style={{ fontSize: 12, color: MUTED }}>Accepted formats: JPG, PNG, WebP · Max 10 MB per file · Up to 4 images</p>
            {fileError && <p style={{ fontSize: 12, color: ERROR, marginTop: 6 }}>{fileError}</p>}
          </div>

          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: INK, marginBottom: 6 }}>Additional Instructions</h3>
            <p style={{ fontSize: 13, color: MUTED, marginBottom: 12, lineHeight: 1.6 }}>Describe the background tone, flower arrangement, color balance, level of detail or painting style you would like the creator to consider.</p>
            <textarea
              value={cfg.instruction}
              onChange={(e) => { if (e.target.value.length <= 600) setCfg({ instruction: e.target.value }) }}
              placeholder="For example: Please keep the main floral arrangement from the reference image, use softer background tones and preserve a visible hand-painted texture."
              rows={5}
              style={{ width: '100%', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '12px 14px', fontSize: 14, color: INK, lineHeight: 1.6, resize: 'vertical', background: '#fff', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }}
            />
            <p style={{ fontSize: 12, color: MUTED, marginTop: 6 }}>{cfg.instruction.length} / 600 characters</p>
          </div>

          <div style={{ background: SURFACE, borderRadius: 6, padding: '14px 16px', fontSize: 13, color: MUTED, lineHeight: 1.6, marginBottom: 32 }}>
            <strong style={{ color: INK, display: 'block', marginBottom: 4 }}>Useful details to include</strong>
            Preferred color palette · background tone · flower arrangement · level of detail · elements to emphasize or simplify · preferred painting style.
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <SecondaryBtn onClick={() => onNavigate('customize-options')}>Back</SecondaryBtn>
            <PrimaryBtn onClick={handleContinue}>Continue</PrimaryBtn>
          </div>
        </div>

        <div>
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '24px', position: 'sticky', top: 88 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: INK, marginBottom: 16 }}>Your Configuration</h3>
            {[['Size', cfg.size], ['Material', cfg.material], ['Frame', cfg.frame], ['Palette', cfg.palette], ['Orientation', cfg.orientation], ['References', `${cfg.uploads.length} photo${cfg.uploads.length !== 1 ? 's' : ''} uploaded`]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                <span style={{ color: MUTED }}>{k}</span>
                <span style={{ color: INK, fontWeight: 500 }}>{v}</span>
              </div>
            ))}
            <div style={{ borderTop: `1px solid ${BORDER}`, margin: '16px 0' }} />
            <div>
              <div style={{ fontSize: 12, color: MUTED, marginBottom: 2 }}>Estimated price</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: INK }}>€{price}</div>
              <div style={{ fontSize: 12, color: MUTED }}>excl. shipping</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Screen 5: Configuration Review ──────────────────────────────────────────

function ReviewScreen({ cfg, setCfg, onNavigate }: { cfg: AppConfig; setCfg: SetAppConfig; onNavigate: (s: Screen) => void }) {
  const price = calcPrice(cfg)
  const shipping = SHIPPING[cfg.delivery]
  const total = price + shipping

  const handleAddToCart = () => {
    setCfg({ cartActive: true })
    onNavigate('cart')
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 40px 80px' }}>
      <div style={{ marginBottom: 28 }}>
        <Breadcrumb items={[{ label: 'Browse Products', screen: 'browse' }, { label: 'Custom Floral Painting', screen: 'product' }, { label: 'Customize' }]} onNavigate={onNavigate} />
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: INK, marginBottom: 32, letterSpacing: '-0.3px' }}>Customize Your Product</h1>
      <ProgressSteps steps={STEPS} active={3} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 56 }}>
        <div>
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}` }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: INK }}>Product</h3>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', gap: 20 }}>
              <img src={FLORAL_THUMB_1} alt="Custom Floral Painting" style={{ width: 80, height: 100, objectFit: 'cover', borderRadius: 4, background: SURFACE, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 4 }}>Custom Floral Painting</div>
                <div style={{ fontSize: 13, color: MUTED, marginBottom: 2 }}>by Elena Marsh</div>
                <div style={{ fontSize: 13, color: MUTED }}>Painting · Customized artwork</div>
              </div>
            </div>
          </div>

          <ReviewSection title="Configuration" onEdit={() => onNavigate('customize-options')} rows={[['Size', cfg.size], ['Material', cfg.material], ['Frame', cfg.frame], ['Color Palette', cfg.palette], ['Orientation', cfg.orientation]]} />

          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: INK }}>Reference Images</h3>
              <button onClick={() => onNavigate('customize-references')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}><EditIcon /> Edit</button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {cfg.uploads.length > 0 ? (
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  {cfg.uploads.map((u) => <img key={u.key} src={u.src} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4, border: `1px solid ${BORDER}` }} />)}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>No reference images uploaded.</div>
              )}
              {cfg.instruction ? (
                <div style={{ fontSize: 13, color: MUTED, fontStyle: 'italic', lineHeight: 1.6, borderLeft: `3px solid ${BORDER}`, paddingLeft: 12 }}>"{cfg.instruction}"</div>
              ) : null}
            </div>
          </div>
        </div>

        <div>
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '24px', position: 'sticky', top: 88 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 20 }}>Order Summary</h3>
            {[
              ['Base price', `€${BASE}`],
              [`Size · ${cfg.size}`, formatPriceAdjustment(SIZE_DELTA[cfg.size] ?? 0)],
              [`Material · ${cfg.material}`, formatPriceAdjustment(MATERIAL_DELTA[cfg.material] ?? 0)],
              [`Frame · ${cfg.frame}`, formatPriceAdjustment(FRAME_DELTA[cfg.frame] ?? 0)],
              [`Color palette · ${cfg.palette}`, formatPriceAdjustment(PALETTE_DELTA[cfg.palette] ?? 0)],
              [`Orientation · ${cfg.orientation}`, formatPriceAdjustment(ORIENTATION_DELTA[cfg.orientation] ?? 0)],
              ['Creator service fee', formatPriceAdjustment(SERVICE_FEE)],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
                <span style={{ color: MUTED }}>{k}</span>
                <span style={{ color: INK }}>{v}</span>
              </div>
            ))}
            <div style={{ borderTop: `1px solid ${BORDER}`, margin: '14px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
              <span style={{ color: INK }}>Configured product</span>
              <span style={{ color: INK }}>€{price}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
              <span style={{ color: MUTED }}>Estimated shipping</span>
              <span style={{ color: INK }}>€{shipping}</span>
            </div>
            <div style={{ borderTop: `1.5px solid ${INK}`, margin: '16px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16, marginBottom: 24 }}>
              <span>Total</span>
              <span>€{total}</span>
            </div>
            <PrimaryBtn onClick={handleAddToCart} fullWidth>Add to Cart</PrimaryBtn>
            <div style={{ marginTop: 10 }}>
              <SecondaryBtn onClick={() => onNavigate('customize-references')} fullWidth>Back</SecondaryBtn>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReviewSection({ title, onEdit, rows }: { title: string; onEdit: () => void; rows: [string, string][] }) {
  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
      <div style={{ padding: '18px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: INK }}>{title}</h3>
        <button onClick={onEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}><EditIcon /> Edit</button>
      </div>
      <div style={{ padding: '16px 24px' }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
            <span style={{ color: MUTED }}>{k}</span>
            <span style={{ color: INK, fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Screen 6: Cart ───────────────────────────────────────────────────────────

function CartScreen({ cfg, setCfg, onNavigate }: { cfg: AppConfig; setCfg: SetAppConfig; onNavigate: (s: Screen) => void }) {
  const price = calcPrice(cfg)
  const shipping = SHIPPING[cfg.delivery]
  const cartItems = getCartItems(cfg)
  const subtotal = getItemsSubtotal(cartItems)
  const total = subtotal + shipping

  const isEmpty = cartItems.length === 0

  if (isEmpty) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: INK, marginBottom: 16 }}>Your Cart</h1>
        <p style={{ fontSize: 15, color: MUTED, marginBottom: 28 }}>Your cart is empty.</p>
        <PrimaryBtn onClick={() => onNavigate('browse')}>Browse Products</PrimaryBtn>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 40px 80px' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: INK, marginBottom: 40, letterSpacing: '-0.3px' }}>Your Cart</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 48 }}>
        <div>
          {cfg.cartActive && <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '24px', display: 'flex', gap: 20 }}>
              <img src={FLORAL_THUMB_1} alt="Custom Floral Painting" style={{ width: 100, height: 120, objectFit: 'cover', borderRadius: 6, background: SURFACE, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: INK }}>Custom Floral Painting</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: INK }}>€{price * cfg.quantity}</div>
                </div>
                <div style={{ fontSize: 13, color: MUTED, marginBottom: 14 }}>by Elena Marsh</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px', marginBottom: 16 }}>
                  {[['Size', cfg.size], ['Material', cfg.material], ['Frame', cfg.frame], ['Palette', cfg.palette], ['Orientation', cfg.orientation], ['References', `${cfg.uploads.length} photo${cfg.uploads.length !== 1 ? 's' : ''}`]].map(([k, v]) => (
                    <div key={k} style={{ fontSize: 12 }}>
                      <span style={{ color: MUTED }}>{k}: </span>
                      <span style={{ color: INK, fontWeight: 500 }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${BORDER}`, borderRadius: 6, overflow: 'hidden' }}>
                    <button onClick={() => setCfg({ quantity: Math.max(1, cfg.quantity - 1) })} style={{ padding: '6px 12px', background: 'none', border: 'none', cursor: 'pointer', color: INK, fontSize: 16 }}>−</button>
                    <span style={{ padding: '6px 12px', fontSize: 14, fontWeight: 500, borderLeft: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}` }}>{cfg.quantity}</span>
                    <button onClick={() => setCfg({ quantity: cfg.quantity + 1 })} style={{ padding: '6px 12px', background: 'none', border: 'none', cursor: 'pointer', color: INK, fontSize: 16 }}>+</button>
                  </div>
                  <button onClick={() => onNavigate('customize-options')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: ACCENT, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}><EditIcon /> Edit configuration</button>
                  <button onClick={() => setCfg({ cartActive: false })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: MUTED, marginLeft: 'auto' }}>Remove</button>
                </div>
              </div>
            </div>
          </div>}
          {/* Simple (non-customizable) cart items */}
          {cfg.simpleCartItems.map((item) => {
            const p = PRODUCT_CARDS.find((c) => c.id === item.productId)
            const d = PRODUCT_DETAILS[item.productId]
            if (!p || !d) return null
            return (
              <div key={item.productId} style={{ border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden', marginTop: 16 }}>
                <div style={{ padding: '24px', display: 'flex', gap: 20 }}>
                  <img src={d.thumbs[0]} alt={p.title} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 6, background: SURFACE, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: INK }}>{p.title}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: INK }}>€{p.priceNum * item.quantity}</div>
                    </div>
                    <div style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>by {p.creator}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${BORDER}`, borderRadius: 6, overflow: 'hidden' }}>
                        <button onClick={() => { const updated = item.quantity <= 1 ? cfg.simpleCartItems.filter((i) => i.productId !== p.id) : cfg.simpleCartItems.map((i) => i.productId === p.id ? { ...i, quantity: i.quantity - 1 } : i); setCfg({ simpleCartItems: updated }) }} style={{ padding: '6px 12px', background: 'none', border: 'none', cursor: 'pointer', color: INK, fontSize: 16 }}>−</button>
                        <span style={{ padding: '6px 12px', fontSize: 14, fontWeight: 500, borderLeft: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}` }}>{item.quantity}</span>
                        <button onClick={() => setCfg({ simpleCartItems: cfg.simpleCartItems.map((i) => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i) })} style={{ padding: '6px 12px', background: 'none', border: 'none', cursor: 'pointer', color: INK, fontSize: 16 }}>+</button>
                      </div>
                      <button onClick={() => setCfg({ simpleCartItems: cfg.simpleCartItems.filter((i) => i.productId !== p.id) })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: MUTED, marginLeft: 'auto' }}>Remove</button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          <div style={{ marginTop: 24 }}>
            <SecondaryBtn onClick={() => onNavigate('browse')}>← Continue Shopping</SecondaryBtn>
          </div>
        </div>

        <div>
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '24px', position: 'sticky', top: 88 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 20 }}>Order Summary</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
              <span style={{ color: MUTED }}>Subtotal</span>
              <span style={{ color: INK }}>€{subtotal}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
              <span style={{ color: MUTED }}>Estimated shipping</span>
              <span style={{ color: INK }}>€{shipping}</span>
            </div>
            <div style={{ borderTop: `1.5px solid ${INK}`, margin: '16px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16, marginBottom: 24 }}>
              <span>Total</span>
              <span>€{total}</span>
            </div>
            <PrimaryBtn onClick={() => onNavigate('checkout')} fullWidth disabled={isEmpty}>Proceed to Checkout</PrimaryBtn>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Screen 7: Checkout ───────────────────────────────────────────────────────

function CheckoutScreen({ cfg, setCfg, onNavigate, session, onRequireCustomer }: {
  cfg: AppConfig
  setCfg: SetAppConfig
  onNavigate: (s: Screen) => void
  session: SessionUser | null
  onRequireCustomer: () => void
}) {
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutForm, string>>>({})
  const firstErrorRef = useRef<HTMLDivElement>(null)

  const cartItems = getCartItems(cfg)
  const subtotal = getItemsSubtotal(cartItems)
  const shipping = SHIPPING[cfg.delivery]
  const total = subtotal + shipping

  const setField = (field: keyof CheckoutForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setCfg({ checkout: { ...cfg.checkout, [field]: e.target.value } })
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n })
  }

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

  const handleSubmit = () => {
    if (session?.role !== 'customer') {
      onRequireCustomer()
      return
    }

    const next: typeof errors = {}
    const { email, name, address1, city, postal } = cfg.checkout
    if (!email.trim()) next.email = 'Required'
    else if (!validateEmail(email)) next.email = 'Please enter a valid email address'
    if (!name.trim()) next.name = 'Required'
    if (!address1.trim()) next.address1 = 'Required'
    if (!city.trim()) next.city = 'Required'
    if (!postal.trim()) next.postal = 'Required'

    if (Object.keys(next).length) {
      setErrors(next)
      setTimeout(() => firstErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
      return
    }

    if (cartItems.length === 0) {
      onNavigate('cart')
      return
    }

    const orderNumber = `#ART-${20481 + cfg.orders.length}`
    const orderedItems = cartItems.map((item) => item.customized
      ? { ...item, workflow: { status: 'pending-creator-review' as const } }
      : item)
    const order: OrderRecord = {
      orderNumber,
      items: orderedItems,
      subtotal,
      shipping,
      total,
      delivery: cfg.delivery,
      checkout: { ...cfg.checkout },
      placedLabel: 'Placed today',
    }

    setCfg((prev) => ({
      orders: [...prev.orders, order],
      currentOrderNumber: orderNumber,
      cartActive: false,
      simpleCartItems: [],
      quantity: 1,
    }))
    onNavigate('confirmation')
  }

  const renderField = (field: keyof CheckoutForm, label: string, placeholder?: string) => (
    <div ref={errors[field] ? firstErrorRef : undefined}>
      <label style={{ fontSize: 12, fontWeight: 500, color: MUTED, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</label>
      <input
        value={cfg.checkout[field]}
        onChange={setField(field)}
        placeholder={placeholder}
        style={{ width: '100%', border: `1px solid ${errors[field] ? ERROR : BORDER}`, borderRadius: 6, padding: '10px 12px', fontSize: 14, color: INK, background: '#fff', boxSizing: 'border-box' }}
      />
      {errors[field] && <div style={{ fontSize: 12, color: ERROR, marginTop: 4 }}>{errors[field]}</div>}
    </div>
  )

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 40px 80px' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: INK, marginBottom: 40, letterSpacing: '-0.3px' }}>Checkout</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 56 }}>
        <div>
          <CheckoutSection title="Contact">
            {renderField("email", "Email address", "you@example.com")}
          </CheckoutSection>

          <CheckoutSection title="Delivery Information">
            {renderField("name", "Full name", "Anna Müller")}
            {renderField("address1", "Address line 1", "Hauptstraße 42")}
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: MUTED, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Address line 2</label>
              <input value={cfg.checkout.address2} onChange={setField('address2')} placeholder="Apartment, floor, etc. (optional)" style={{ width: '100%', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '10px 12px', fontSize: 14, color: INK, background: '#fff', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {renderField("city", "City", "Vienna")}
              {renderField("postal", "Postal code", "1010")}
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: MUTED, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Country</label>
              <select value={cfg.checkout.country} onChange={setField('country')} style={{ width: '100%', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '10px 12px', fontSize: 14, color: INK, background: '#fff', appearance: 'none', boxSizing: 'border-box' }}>
                {['Austria', 'Germany', 'Switzerland', 'United Kingdom', 'France', 'Netherlands', 'Belgium', 'Spain', 'Italy', 'Romania'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </CheckoutSection>

          <CheckoutSection title="Delivery Method">
            {([['standard', 'Standard Delivery', '14–21 business days', `€${SHIPPING.standard}`], ['express', 'Express Delivery', '7–10 business days', `€${SHIPPING.express}`]] as const).map(([key, label, sub, price]) => (
              <DeliveryOption key={key} label={label} sub={sub} price={price} selected={cfg.delivery === key} onClick={() => setCfg({ delivery: key })} />
            ))}
          </CheckoutSection>

          <CheckoutSection title="Payment" last>
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 6, padding: '14px 16px', background: SURFACE, fontSize: 13, color: MUTED }}>
              Payment information is represented conceptually in this prototype.
            </div>
          </CheckoutSection>

          <div style={{ marginTop: 32 }}>
            <PrimaryBtn onClick={handleSubmit}>Place Order</PrimaryBtn>
          </div>
        </div>

        <div>
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden', position: 'sticky', top: 88 }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}` }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: INK }}>Order Summary</h3>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
                {cartItems.map((item) => (
                  <div key={`${item.productId}-${item.customized ? 'custom' : 'standard'}`} style={{ display: 'flex', gap: 12, paddingBottom: 16, borderBottom: `1px solid ${BORDER}` }}>
                    <img src={item.image} alt={item.title} style={{ width: 52, height: 64, objectFit: 'cover', borderRadius: 4, background: SURFACE, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: INK, marginBottom: 2 }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: MUTED }}>by {item.creator} · Qty {item.quantity}</div>
                      {item.customized && <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.5, marginTop: 4 }}>{getCustomizationLabel(item)}</div>}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: INK, flexShrink: 0 }}>€{item.unitPrice * item.quantity}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                <span style={{ color: MUTED }}>Subtotal</span>
                <span>€{subtotal}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                <span style={{ color: MUTED }}>Shipping</span>
                <span>€{shipping}</span>
              </div>
              <div style={{ borderTop: `1.5px solid ${INK}`, margin: '14px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15 }}>
                <span>Total</span>
                <span>€{total}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CheckoutSection({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ marginBottom: last ? 0 : 36, paddingBottom: last ? 0 : 36, borderBottom: last ? 'none' : `1px solid ${BORDER}` }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 18 }}>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
    </div>
  )
}

function DeliveryOption({ label, sub, price, selected, onClick }: { label: string; sub: string; price: string; selected: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ border: `1.5px solid ${selected ? ACCENT : hover ? '#bfb9b1' : BORDER}`, borderRadius: 6, padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'border-color 0.15s', background: selected ? '#f0f5f2' : '#fff' }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selected ? ACCENT : BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {selected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT }} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: selected ? 600 : 400, color: INK }}>{label}</div>
        <div style={{ fontSize: 12, color: MUTED }}>{sub}</div>
      </div>
      <span style={{ fontSize: 14, fontWeight: 600, color: INK }}>{price}</span>
    </div>
  )
}

// ─── Screen 8: Order Confirmation ────────────────────────────────────────────

function ConfirmationScreen({ order, onNavigate, onViewOrder }: { order?: OrderRecord; onNavigate: (s: Screen) => void; onViewOrder: (orderNumber: string) => void }) {
  if (!order) {
    return (
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '80px 40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: INK, marginBottom: 12 }}>No recent order</h1>
        <p style={{ fontSize: 14, color: MUTED, marginBottom: 24 }}>Place an order to see its confirmation details here.</p>
        <PrimaryBtn onClick={() => onNavigate('browse')}>Browse Products</PrimaryBtn>
      </div>
    )
  }

  const hasCustomizedItem = order.items.some((item) => item.customized)

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '80px 40px 80px', textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#e8f0ec', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
        <CheckIcon size={28} color={ACCENT} />
      </div>
      <h1 style={{ fontSize: 30, fontWeight: 700, color: INK, marginBottom: 12, letterSpacing: '-0.4px' }}>Order Confirmed</h1>
      <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.7, marginBottom: 32, maxWidth: 440, margin: '0 auto 32px' }}>
        {hasCustomizedItem ? "Your order was placed successfully. Elena Marsh will review the customized floral artwork request before work begins." : 'Your order was placed successfully and is ready to view in My Orders.'}
      </p>

      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden', marginBottom: 40, textAlign: 'left' }}>
        <div style={{ padding: '18px 24px', background: SURFACE, borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: MUTED }}>Order number</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: INK }}>{order.orderNumber}</span>
        </div>
        <div style={{ padding: '20px 24px' }}>
          {order.items.map((item, index) => (
            <div key={`${item.productId}-${index}`} style={{ display: 'flex', gap: 16, paddingBottom: 18, marginBottom: 18, borderBottom: `1px solid ${BORDER}` }}>
              <img src={item.image} alt={item.title} style={{ width: 64, height: 80, objectFit: 'cover', borderRadius: 4, background: SURFACE, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 2 }}>{item.title}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>€{item.unitPrice * item.quantity}</div>
                </div>
                <div style={{ fontSize: 13, color: MUTED }}>by {item.creator} · Quantity {item.quantity}</div>
                {item.customized && (
                  <>
                    <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, marginTop: 8 }}>{getCustomizationLabel(item)}</div>
                    <div style={{ fontSize: 12, color: MUTED }}>{item.customization?.uploads.length ?? 0} reference image{item.customization?.uploads.length === 1 ? '' : 's'}</div>
                  </>
                )}
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 2 }}>Estimated delivery</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: INK }}>{order.delivery === 'express' ? '7–10' : '14–21'} business days</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 2 }}>Total paid</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: INK }}>€{order.total}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <PrimaryBtn onClick={() => onViewOrder(order.orderNumber)}>View Order</PrimaryBtn>
        <SecondaryBtn onClick={() => onNavigate('browse')}>Continue Browsing</SecondaryBtn>
      </div>
    </div>
  )
}

// ─── Screen 9: Order Status ───────────────────────────────────────────────────

const STATUS_STEPS = ['Request Received', 'Creator Review', 'In Progress', 'Review', 'Shipped']

function StandardOrderStatusScreen({ order, onNavigate }: { order: OrderRecord; onNavigate: (s: Screen) => void }) {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 40px 80px' }}>
      <div style={{ fontSize: 13, color: MUTED, marginBottom: 6 }}>Order {order.orderNumber}</div>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: INK, letterSpacing: '-0.3px', marginBottom: 10 }}>Order Status</h1>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#e8f0ec', color: ACCENT, border: '1px solid #b2d0c4', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600, marginBottom: 32 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT, display: 'inline-block' }} />
        Order Confirmed
      </span>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 40 }}>
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: `1px solid ${BORDER}` }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: INK }}>Ordered Items</h3>
          </div>
          <div style={{ padding: '4px 24px' }}>
            {order.items.map((item, index) => (
              <div key={`${item.productId}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 0', borderBottom: index < order.items.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                <img src={item.image} alt={item.title} style={{ width: 60, height: 70, objectFit: 'cover', borderRadius: 5, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: INK, marginBottom: 3 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: MUTED }}>by {item.creator} · Quantity {item.quantity}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>€{item.unitPrice * item.quantity}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '20px 24px', marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: INK, marginBottom: 16 }}>Order Summary</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}><span style={{ color: MUTED }}>Subtotal</span><span>€{order.subtotal}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 12 }}><span style={{ color: MUTED }}>Shipping</span><span>€{order.shipping}</span></div>
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}><span>Total paid</span><span>€{order.total}</span></div>
          </div>
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '20px 24px', marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: INK, marginBottom: 10 }}>Shipping & Tracking</h3>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 12 }}>Tracking information will appear here when the order is dispatched.</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}><span style={{ color: MUTED }}>Method</span><span style={{ fontWeight: 500 }}>{order.delivery === 'express' ? 'Express Delivery' : 'Standard Delivery'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: MUTED }}>Estimated</span><span style={{ fontWeight: 500 }}>{order.delivery === 'express' ? '7–10' : '14–21'} business days</span></div>
          </div>
          <SecondaryBtn onClick={() => onNavigate('browse')} fullWidth>Continue Browsing</SecondaryBtn>
        </div>
      </div>
    </div>
  )
}

function OrderStatusScreen({ order, onNavigate, onUpdateWorkflow }: { order?: OrderRecord; onNavigate: (s: Screen) => void; onUpdateWorkflow: (orderNumber: string, update: Partial<CustomWorkflow>) => void }) {
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [feedbackError, setFeedbackError] = useState('')
  const [clarificationResponse, setClarificationResponse] = useState('')
  const [clarificationUploads, setClarificationUploads] = useState<UploadedImage[]>([])
  const [clarificationError, setClarificationError] = useState('')
  const clarificationKeyRef = useRef(Date.now())
  const customItem = order?.items.find((item) => item.customized && item.customization)

  if (!order) {
    return (
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '80px 40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: INK, marginBottom: 12 }}>Order not found</h1>
        <PrimaryBtn onClick={() => onNavigate('my-orders')}>Back to My Orders</PrimaryBtn>
      </div>
    )
  }

  if (!customItem?.customization) return <StandardOrderStatusScreen order={order} onNavigate={onNavigate} />

  const cfg = customItem.customization
  const workflow = getCustomWorkflow(customItem)
  const tone = getWorkflowTone(workflow.status)
  const stageIndex = workflow.status === 'shipped'
    ? 4
    : workflow.status === 'pending-creator-review' || workflow.status === 'modification-requested' || workflow.status === 'customer-response-sent'
      ? 1
      : workflow.status === 'in-progress'
        ? 2
        : 3

  const submitFeedback = () => {
    if (feedback.trim().length < 10) {
      setFeedbackError('Please enter at least 10 characters so the requested change is clear.')
      return
    }
    onUpdateWorkflow(order.orderNumber, { status: 'changes-requested', customerFeedback: feedback })
    setFeedbackOpen(false)
    setFeedbackError('')
  }

  const handleClarificationFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith('image/'))
    const loadedImages = (await Promise.all(files.map((file) => new Promise<UploadedImage | null>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve({ key: clarificationKeyRef.current++, src: reader.result as string, name: file.name })
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(file)
    })))).filter((image): image is UploadedImage => image !== null)
    setClarificationUploads((current) => [...current, ...loadedImages])
    event.target.value = ''
  }

  const submitClarification = () => {
    const response = clarificationResponse.trim()
    if (response.length < 10) {
      setClarificationError('Please enter at least 10 characters so your response is clear.')
      return
    }
    onUpdateWorkflow(order.orderNumber, {
      status: 'customer-response-sent',
      customerModificationResponse: response,
      customerModificationUploads: clarificationUploads,
    })
    setClarificationError('')
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 40px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36 }}>
        <div>
          <div style={{ fontSize: 13, color: MUTED, marginBottom: 6 }}>Order {order.orderNumber}</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: INK, letterSpacing: '-0.3px', marginBottom: 10 }}>Order Status</h1>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: tone.bg, color: tone.color, border: `1px solid ${tone.border}`, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: tone.color, display: 'inline-block' }} />
            {WORKFLOW_LABELS[workflow.status]}
          </span>
        </div>
      </div>

      {/* Stepper */}
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '28px 32px', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {STATUS_STEPS.map((step, i) => {
            const done = i < stageIndex
            const current = i === stageIndex
            return (
              <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < STATUS_STEPS.length - 1 ? 1 : undefined }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: done ? ACCENT : 'transparent', border: done || current ? `2px solid ${ACCENT}` : `2px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {done ? <CheckIcon size={14} /> : current ? <span style={{ width: 10, height: 10, borderRadius: '50%', background: ACCENT, display: 'block' }} /> : null}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: current ? 700 : done ? 500 : 400, color: done || current ? INK : MUTED, whiteSpace: 'nowrap', textAlign: 'center' }}>{step}</span>
                </div>
                {i < STATUS_STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: i < stageIndex ? ACCENT : BORDER, margin: '0 0 20px', minWidth: 32 }} />}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 40 }}>
        <div>

          {workflow.status === 'pending-creator-review' && (
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '24px', background: '#fff' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 12 }}>Pending Creator Review</h3>
              <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.7, margin: 0 }}>Your customized request has been received. Elena Marsh has not accepted it yet.</p>
            </div>
          )}

          {workflow.status === 'modification-requested' && (
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '24px', background: '#fff' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 12 }}>Creator requested additional information</h3>
              <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.7, margin: '0 0 18px' }}>Elena Marsh needs more information before accepting this customized artwork request.</p>
              {workflow.creatorModificationNote && <div style={{ background: SURFACE, borderRadius: 6, padding: '14px 16px', fontSize: 14, color: INK, lineHeight: 1.65, marginBottom: 20 }}><strong>Elena's request:</strong> {workflow.creatorModificationNote}</div>}
              <div style={{ fontSize: 14, fontWeight: 600, color: INK, marginBottom: 8 }}>Your response</div>
              <textarea value={clarificationResponse} onChange={(event) => { setClarificationResponse(event.target.value); setClarificationError('') }} rows={5} placeholder="Add the details Elena needs to review your request." style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${clarificationError ? ERROR : BORDER}`, borderRadius: 6, padding: '11px 12px', fontFamily: 'Inter, sans-serif', fontSize: 14, color: INK, lineHeight: 1.6, resize: 'vertical' }} />
              {clarificationError && <div style={{ color: ERROR, fontSize: 12, marginTop: 6 }}>{clarificationError}</div>}
              <div style={{ marginTop: 16 }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '8px 14px', fontSize: 13, color: INK, cursor: 'pointer', background: '#fff' }}>Add supporting images<input type="file" accept="image/*" multiple onChange={handleClarificationFiles} style={{ display: 'none' }} /></label>
                <div style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>Optional supplemental references for this clarification.</div>
              </div>
              {clarificationUploads.length > 0 && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>{clarificationUploads.map((upload, index) => <div key={upload.key} style={{ position: 'relative' }}><img src={upload.src} alt={`Supplemental reference ${index + 1}`} style={{ width: 92, height: 92, objectFit: 'cover', borderRadius: 6, border: `1px solid ${BORDER}` }} /><button type="button" aria-label={`Remove ${upload.name}`} onClick={() => setClarificationUploads((uploads) => uploads.filter((candidate) => candidate.key !== upload.key))} style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', border: 0, background: 'rgba(31, 35, 33, 0.78)', color: '#fff', cursor: 'pointer', lineHeight: 1 }}>×</button></div>)}</div>}
              <div style={{ marginTop: 18 }}><PrimaryBtn onClick={submitClarification}>Send Response</PrimaryBtn></div>
            </div>
          )}

          {workflow.status === 'customer-response-sent' && (
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '24px', background: '#fff' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 10 }}>Response Sent</h3>
              <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.7, margin: '0 0 18px' }}>Elena has received your additional information. Your request is now awaiting creator review.</p>
              {workflow.creatorModificationNote && <div style={{ background: SURFACE, borderRadius: 6, padding: '14px 16px', fontSize: 14, color: INK, lineHeight: 1.65, marginBottom: 12 }}><strong>Elena's request:</strong> {workflow.creatorModificationNote}</div>}
              <div style={{ border: `1px solid ${BORDER}`, borderRadius: 6, padding: '14px 16px', fontSize: 14, color: INK, lineHeight: 1.65 }}><strong>Your response:</strong> {workflow.customerModificationResponse}</div>
              {Boolean(workflow.customerModificationUploads?.length) && <div style={{ marginTop: 18 }}><div style={{ fontSize: 12, fontWeight: 600, color: INK, marginBottom: 10 }}>Supplemental images</div><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{workflow.customerModificationUploads?.map((upload, index) => <img key={upload.key} src={upload.src} alt={`Supplemental reference ${index + 1}`} style={{ width: 104, height: 104, objectFit: 'cover', borderRadius: 6, border: `1px solid ${BORDER}` }} />)}</div></div>}
            </div>
          )}

          {workflow.status === 'in-progress' && (
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '24px', background: '#fff' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 10 }}>Artwork in Progress</h3>
              <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.7, margin: 0 }}>Elena Marsh accepted your request and is working on the customized floral painting. A progress image will appear here after the creator submits an update.</p>
            </div>
          )}

          {workflow.status === 'awaiting-customer-review' && (
            <>
              <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden', marginBottom: 24, background: '#fff' }}>
                <div style={{ padding: '18px 24px', borderBottom: `1px solid ${BORDER}` }}><h3 style={{ fontSize: 14, fontWeight: 600, color: INK }}>Artwork Progress</h3></div>
                {workflow.progressImage && <img src={workflow.progressImage} alt="Floral artwork progress submitted by Elena Marsh" style={{ width: '100%', height: 320, objectFit: 'cover', display: 'block' }} />}
              </div>
              <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '20px 24px', marginBottom: 24, background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}><img src={CREATOR_IMG} alt="Elena Marsh" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} /><div><div style={{ fontSize: 14, fontWeight: 600, color: INK }}>Elena Marsh</div><div style={{ fontSize: 12, color: MUTED }}>Creator progress update</div></div></div>
                <p style={{ fontSize: 14, color: INK, lineHeight: 1.7, margin: 0 }}>{workflow.progressNote}</p>
              </div>
              {!feedbackOpen ? (
                <div style={{ display: 'flex', gap: 12 }}>
                  <PrimaryBtn onClick={() => onUpdateWorkflow(order.orderNumber, { status: 'progress-approved' })}>Approve Progress</PrimaryBtn>
                  <SecondaryBtn onClick={() => setFeedbackOpen(true)}>Request Changes</SecondaryBtn>
                </div>
              ) : (
                <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '20px 24px', background: '#fff' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: INK, marginBottom: 8 }}>Describe the changes you'd like</div>
                  <textarea value={feedback} onChange={(e) => { setFeedback(e.target.value); setFeedbackError('') }} rows={4} placeholder="e.g. Please soften the background and give the darker flowers slightly more emphasis." style={{ width: '100%', border: `1px solid ${feedbackError ? ERROR : BORDER}`, borderRadius: 6, padding: '10px 12px', fontSize: 14, color: INK, lineHeight: 1.6, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif', marginBottom: feedbackError ? 6 : 14 }} />
                  {feedbackError && <div style={{ fontSize: 12, color: ERROR, marginBottom: 14 }}>{feedbackError}</div>}
                  <div style={{ display: 'flex', gap: 10 }}><PrimaryBtn small onClick={submitFeedback}>Send Feedback</PrimaryBtn><SecondaryBtn small onClick={() => { setFeedbackOpen(false); setFeedback(''); setFeedbackError('') }}>Cancel</SecondaryBtn></div>
                </div>
              )}
            </>
          )}

          {workflow.status === 'changes-requested' && (
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '24px', background: '#fff' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 10 }}>Changes Requested</h3>
              <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.7, margin: '0 0 16px' }}>Your feedback was sent. Elena Marsh is preparing an updated version.</p>
              <div style={{ background: SURFACE, borderRadius: 6, padding: '14px 16px', fontSize: 14, color: INK, lineHeight: 1.65 }}><strong>Your feedback:</strong> {workflow.customerFeedback}</div>
            </div>
          )}

          {workflow.status === 'progress-approved' && <WorkflowMessage title="Progress Approved" body="Your approval has been recorded. Elena Marsh can complete the artwork; shipping is still pending." />}
          {workflow.status === 'completed' && <WorkflowMessage title="Artwork Completed" body="Elena Marsh marked the artwork as complete. It is being prepared for shipment and tracking is pending." />}
          {workflow.status === 'shipped' && (
            <div style={{ border: `1.5px solid ${ACCENT}`, borderRadius: 8, padding: '24px', background: '#f0f5f2' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: INK, marginBottom: 8 }}>Shipped</h3>
              <p style={{ fontSize: 14, color: MUTED, margin: '0 0 18px' }}>Your customized artwork has been dispatched.</p>
              <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '14px 18px' }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}><span style={{ color: MUTED }}>Carrier</span><strong>{workflow.carrier}</strong></div><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: MUTED }}>Tracking number</span><strong style={{ fontFamily: 'monospace' }}>{workflow.trackingNumber}</strong></div></div>
            </div>
          )}

          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: '20px 24px', marginTop: 24, background: '#fff' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: INK, marginBottom: 14 }}>Your Configuration</h3>
            {[['Size', cfg.size], ['Material', cfg.material], ['Frame', cfg.frame], ['Color palette', cfg.palette], ['Orientation', cfg.orientation], ['Reference images', String(cfg.uploads.length)]].map(([label, value]) => <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}><span style={{ color: MUTED }}>{label}</span><span style={{ fontWeight: 500 }}>{value}</span></div>)}
            {cfg.instruction && <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, marginTop: 12, fontSize: 13, color: MUTED, lineHeight: 1.6 }}><strong style={{ color: INK }}>Instructions:</strong> {cfg.instruction}</div>}
          </div>

        </div>

        {/* Sidebar */}
        <div>
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${BORDER}` }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: INK }}>Order Summary</h3>
            </div>
            <div style={{ padding: '18px 24px' }}>
              {order.items.map((item, index) => (
                <div key={`${item.productId}-${index}`} style={{ display: 'flex', gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: `1px solid ${BORDER}` }}>
                  <img src={item.image} alt={item.title} style={{ width: 52, height: 64, objectFit: 'cover', borderRadius: 4, background: SURFACE, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: INK, marginBottom: 2 }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: MUTED }}>Quantity {item.quantity}</div>
                    {item.customized && <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.5, marginTop: 3 }}>{getCustomizationLabel(item)}</div>}
                  </div>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                  <span style={{ color: MUTED }}>Total paid</span>
                  <span style={{ fontWeight: 700, color: INK }}>€{order.total}</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${BORDER}` }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: INK }}>Shipping & Tracking</h3>
            </div>
            <div style={{ padding: '18px 24px' }}>
              {workflow.status !== 'shipped' && <div style={{ fontSize: 13, color: MUTED, marginBottom: 12 }}>Tracking information will be provided once your artwork has been completed and dispatched.</div>}
              {workflow.status === 'shipped' && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>Tracking number</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: INK, fontFamily: 'monospace', letterSpacing: '0.4px' }}>{workflow.trackingNumber}</div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>{workflow.carrier}</div>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: MUTED }}>Method</span>
                <span style={{ color: INK, fontWeight: 500 }}>{order.delivery === 'express' ? 'Express Delivery' : 'Standard Delivery'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: MUTED }}>Estimated</span>
                <span style={{ color: INK, fontWeight: 500 }}>{order.delivery === 'express' ? '7–10' : '14–21'} business days</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function WorkflowMessage({ title, body }: { title: string; body: string }) {
  return <div style={{ border: `1.5px solid #bac8ff`, borderRadius: 8, padding: '22px 24px', background: '#edf2ff' }}><h3 style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 7 }}>{title}</h3><p style={{ fontSize: 14, color: MUTED, lineHeight: 1.65, margin: 0 }}>{body}</p></div>
}

// ─── Creator data ─────────────────────────────────────────────────────────────

const CREATORS = [
  {
    id: 1,
    name: 'Elena Marsh',
    location: 'Vienna, Austria',
    specialty: 'Floral Painting',
    tags: ['Oil', 'Acrylic', 'Floral'],
    bio: 'Elena trained at the Vienna Academy of Fine Arts and has spent fifteen years developing a painterly, expressive approach to floral artwork. She uses customer reference images as visual guidance, preserving recognizable arrangements while refining color, balance and brushwork. Her customized paintings are held in private collections across Europe.',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&auto=format',
    studioImg: 'https://images.unsplash.com/photo-1774689305776-a4d005b42a2a?w=600&h=400&fit=crop&auto=format',
    productId: 1,
    productCount: 1,
    startingFrom: '€89',
    completedOrders: 214,
    responseTime: 'Within 24 hours',
  },
  {
    id: 2,
    name: 'Tobias Venn',
    location: 'Berlin, Germany',
    specialty: 'Abstract Printmaking',
    tags: ['Print', 'Abstract', 'Mixed Media'],
    bio: 'Tobias studied graphic arts in Berlin and has developed a distinctive visual language rooted in geological abstraction — layers of pigment echoing sediment, coastline, and horizon. Each print begins as an original painting before being translated into a fine art edition. He works from a light-filled studio in Prenzlauer Berg.',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop&auto=format',
    studioImg: 'https://images.unsplash.com/photo-1598240087583-2f610faf1eaf?w=600&h=400&fit=crop&auto=format',
    productId: 2,
    productCount: 1,
    startingFrom: '€65',
    completedOrders: 138,
    responseTime: 'Within 48 hours',
  },
  {
    id: 3,
    name: 'Sara Okonkwo',
    location: 'London, United Kingdom',
    specialty: 'Botanical Watercolor',
    tags: ['Watercolor', 'Botanical', 'Floral'],
    bio: 'Sara works in the tradition of scientific botanical illustration, combining rigorous observational drawing with a sensitivity to color and light. She paints on 300gsm cotton paper using professional-grade pigments chosen for their archival permanence. Her studies have been acquired by collectors and botanical gardens internationally.',
    avatar: 'https://images.unsplash.com/photo-1619107187488-ae0b914b1811?w=120&h=120&fit=crop&auto=format',
    studioImg: 'https://images.unsplash.com/photo-1750922179530-30508825848c?w=600&h=400&fit=crop&auto=format',
    productId: 3,
    productCount: 1,
    startingFrom: '€74',
    completedOrders: 97,
    responseTime: 'Within 24 hours',
  },
  {
    id: 4,
    name: 'Marcus Bell',
    location: 'Amsterdam, Netherlands',
    specialty: 'Graphite Drawing',
    tags: ['Graphite', 'Drawing', 'Portrait'],
    bio: 'Marcus trained in classical drawing at the Rijksakademie and brings a rigorous tonal discipline to every piece. His pencil portraits are characterized by confident mark-making, controlled gradation and a strong sense of presence. His Artian collection focuses on original graphite portrait studies on quality art paper.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&auto=format',
    studioImg: 'https://images.unsplash.com/photo-1593472807861-5bb884af28f6?w=600&h=400&fit=crop&auto=format',
    productId: 4,
    productCount: 1,
    startingFrom: '€110',
    completedOrders: 73,
    responseTime: 'Within 48 hours',
  },
  {
    id: 5,
    name: 'Yuki Tanaka',
    location: 'Tokyo, Japan',
    specialty: 'Architectural Illustration',
    tags: ['Illustration', 'Architecture', 'Minimalist'],
    bio: 'Yuki combines architectural training with a graphic sensibility shaped by Japanese design principles — clarity, negative space, and precise reduction. Her city illustrations distil complex skylines into calm, confident compositions. Her Artian collection presents selected skyline illustrations as finished art prints.',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&auto=format',
    studioImg: 'https://images.unsplash.com/photo-1768471126011-2e2002832826?w=600&h=400&fit=crop&auto=format',
    productId: 5,
    productCount: 1,
    startingFrom: '€58',
    completedOrders: 185,
    responseTime: 'Within 24 hours',
  },
  {
    id: 6,
    name: 'Clara Roth',
    location: 'Zurich, Switzerland',
    specialty: 'Pet Portrait in Oil',
    tags: ['Oil', 'Pet', 'Portrait'],
    bio: 'Clara has dedicated her practice to animal portraiture, developing an exceptional facility for capturing the character and energy of individual animals in oil on linen. She paints with a controlled but expressive touch, giving particular attention to the texture of fur, the quality of the eyes, and the personality that makes each subject unique.',
    avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=120&h=120&fit=crop&auto=format',
    studioImg: 'https://images.unsplash.com/photo-1763073066060-66c4fda08f38?w=600&h=400&fit=crop&auto=format',
    productId: 6,
    productCount: 1,
    startingFrom: '€99',
    completedOrders: 61,
    responseTime: 'Within 48 hours',
  },
]

// ─── Screen: Creators ─────────────────────────────────────────────────────────

function CreatorsScreen({ onNavigate, onSelectProduct }: { onNavigate: (s: Screen) => void; onSelectProduct: (id: number) => void }) {
  const [activeSpecialty, setActiveSpecialty] = useState('All')
  const [search, setSearch] = useState('')

  const specialties = ['All', 'Painting', 'Printmaking', 'Watercolor', 'Drawing', 'Illustration']

  const filtered = CREATORS.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.specialty.toLowerCase().includes(search.toLowerCase()) || c.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    const matchSpec =
      activeSpecialty === 'All' ||
      (activeSpecialty === 'Painting' && c.tags.includes('Oil')) ||
      (activeSpecialty === 'Painting' && c.tags.includes('Acrylic')) ||
      (activeSpecialty === 'Printmaking' && c.tags.includes('Print')) ||
      (activeSpecialty === 'Watercolor' && c.tags.includes('Watercolor')) ||
      (activeSpecialty === 'Drawing' && c.tags.includes('Drawing')) ||
      (activeSpecialty === 'Illustration' && c.tags.includes('Illustration'))
    return matchSearch && matchSpec
  })

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '52px 40px 80px' }}>
      {/* Hero */}
      <div style={{ marginBottom: 48 }}>
        <h1 style={{ fontSize: 36, fontWeight: 700, color: INK, letterSpacing: '-0.5px', marginBottom: 12 }}>
          Independent Creators
        </h1>
        <p style={{ fontSize: 15, color: MUTED, maxWidth: 560, lineHeight: 1.6 }}>
          Every piece on Artian is made by hand by an independent creator. Browse the community, explore available work, and customize selected artwork where that option is offered.
        </p>
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 40, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 200 }}>
          <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} width="16" height="16" fill="none" stroke={MUTED} strokeWidth={1.8} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search creators or specialties…" style={{ width: '100%', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '10px 12px 10px 36px', fontSize: 14, color: INK, background: '#fff', boxSizing: 'border-box' }} />
        </div>
        <FilterGroup label="Specialty" options={specialties} active={activeSpecialty} onChange={setActiveSpecialty} />
      </div>

      <p style={{ fontSize: 13, color: MUTED, marginBottom: 32 }}>
        {filtered.length} creator{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <p style={{ fontSize: 15, color: MUTED, marginBottom: 20 }}>No creators found.</p>
          <SecondaryBtn onClick={() => { setSearch(''); setActiveSpecialty('All') }}>Clear filters</SecondaryBtn>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 32 }}>
          {filtered.map((creator) => (
            <CreatorCard key={creator.id} creator={creator} onNavigate={onNavigate} onSelectProduct={onSelectProduct} />
          ))}
        </div>
      )}
    </div>
  )
}

function CreatorCard({ creator, onNavigate, onSelectProduct }: { creator: typeof CREATORS[0]; onNavigate: (s: Screen) => void; onSelectProduct: (id: number) => void }) {
  const [hover, setHover] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const handleViewProduct = () => {
    onSelectProduct(creator.productId)
    onNavigate('product')
  }

  return (
    <div
      style={{
        border: `1px solid ${hover ? '#bfb9b1' : BORDER}`,
        borderRadius: 10,
        overflow: 'hidden',
        background: '#fff',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: hover ? '0 4px 20px rgba(0,0,0,0.07)' : 'none',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Studio image */}
      <div style={{ position: 'relative', overflow: 'hidden', background: SURFACE, height: 200 }}>
        <img
          src={creator.studioImg}
          alt={`${creator.name}'s work`}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: hover ? 'scale(1.03)' : 'scale(1)', transition: 'transform 0.4s ease' }}
        />
        {/* Specialty tag */}
        <span style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(255,255,255,0.92)', color: INK, fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 4, letterSpacing: '0.2px' }}>
          {creator.specialty}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '22px 24px 24px' }}>
        {/* Avatar + name row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <img
            src={creator.avatar}
            alt={creator.name}
            style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${BORDER}`, flexShrink: 0 }}
          />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: INK, marginBottom: 2 }}>{creator.name}</div>
            <div style={{ fontSize: 13, color: MUTED, display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="12" height="12" fill="none" stroke={MUTED} strokeWidth={2} viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
              {creator.location}
            </div>
          </div>
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {creator.tags.map((tag) => (
            <span key={tag} style={{ fontSize: 11, color: MUTED, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 4, padding: '2px 8px', fontWeight: 500 }}>{tag}</span>
          ))}
        </div>

        {/* Bio */}
        <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.65, marginBottom: 12, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: expanded ? 'unset' : 2, WebkitBoxOrient: 'vertical' }}>
          {creator.bio}
        </p>
        {creator.bio.length > 120 && (
          <button onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v) }} style={{ background: 'none', border: 'none', padding: 0, fontSize: 13, color: ACCENT, cursor: 'pointer', fontWeight: 500, marginBottom: 18 }}>
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
        {!creator.bio.length || creator.bio.length <= 120 ? <div style={{ marginBottom: 18 }} /> : null}

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 0, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, margin: '0 0 20px', padding: '12px 0' }}>
          {[
            ['From', creator.startingFrom],
            ['Orders', String(creator.completedOrders)],
            ['Response', creator.responseTime],
          ].map(([label, value], i) => (
            <div key={label} style={{ flex: 1, paddingLeft: i > 0 ? 16 : 0, borderLeft: i > 0 ? `1px solid ${BORDER}` : 'none' }}>
              <div style={{ fontSize: 10, color: MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{value}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <PrimaryBtn onClick={handleViewProduct} fullWidth>View Product</PrimaryBtn>
      </div>
    </div>
  )
}

// ─── Screen: Wishlist ─────────────────────────────────────────────────────────

function WishlistScreen({ cfg, setCfg, onNavigate, onSelectProduct }: { cfg: AppConfig; setCfg: SetAppConfig; onNavigate: (s: Screen) => void; onSelectProduct: (id: number) => void }) {
  const items = PRODUCT_CARDS.filter((p) => cfg.wishlist.includes(p.id))

  const removeFromWishlist = (id: number) =>
    setCfg({ wishlist: cfg.wishlist.filter((w) => w !== id) })

  const handleAddToCart = (product: typeof PRODUCT_CARDS[0]) => {
    if (product.id === 1) {
      onSelectProduct(product.id)
      onNavigate('product')
      return
    }
    const existing = cfg.simpleCartItems.find((i) => i.productId === product.id)
    const updated = existing
      ? cfg.simpleCartItems.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      : [...cfg.simpleCartItems, { productId: product.id, quantity: 1 }]
    setCfg({ simpleCartItems: updated })
  }

  const inCart = (id: number) =>
    (id === 1 && cfg.cartActive) || cfg.simpleCartItems.some((i) => i.productId === id)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 40px 80px' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: INK, letterSpacing: '-0.3px', marginBottom: 8 }}>Saved to Wishlist</h1>
      <p style={{ fontSize: 14, color: MUTED, marginBottom: 40 }}>
        {items.length} {items.length === 1 ? 'item' : 'items'} saved
      </p>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: SURFACE, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: MUTED }}>
            <HeartIcon />
          </div>
          <p style={{ fontSize: 15, color: MUTED, marginBottom: 24 }}>Your wishlist is empty.</p>
          <SecondaryBtn onClick={() => onNavigate('browse')}>Browse Products</SecondaryBtn>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {items.map((product) => {
            const detail = PRODUCT_DETAILS[product.id]
            const added = inCart(product.id)
            return (
              <div
                key={product.id}
                style={{ border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden', display: 'flex', gap: 0 }}
              >
                {/* Image */}
                <div
                  onClick={() => { onSelectProduct(product.id); onNavigate('product') }}
                  style={{ width: 160, flexShrink: 0, background: SURFACE, cursor: 'pointer', overflow: 'hidden' }}
                >
                  <img
                    src={detail.thumbs[0]}
                    alt={product.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }}
                  />
                </div>

                {/* Content */}
                <div style={{ flex: 1, padding: '24px 28px', display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: MUTED, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 6 }}>{product.category}</div>
                    <button
                      onClick={() => { onSelectProduct(product.id); onNavigate('product') }}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                    >
                      <div style={{ fontSize: 16, fontWeight: 600, color: INK, marginBottom: 4 }}>{product.title}</div>
                    </button>
                    <div style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>by {product.creator}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <PrimaryBtn small onClick={() => handleAddToCart(product)}>
                        {product.id === 1
                          ? 'Customize & Add to Cart'
                          : added ? '✓ In Cart' : 'Add to Cart'}
                      </PrimaryBtn>
                      <SecondaryBtn small onClick={() => removeFromWishlist(product.id)}>Remove</SecondaryBtn>
                    </div>
                  </div>

                  {/* Price */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>{detail.isFullFlow ? 'From' : 'Price'}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: INK }}>{product.price}</div>
                    {detail.isFullFlow && (
                      <div style={{ fontSize: 11, color: ACCENT, fontWeight: 500, marginTop: 4, background: '#e8f0ec', padding: '2px 8px', borderRadius: 4, display: 'inline-block' }}>Customizable</div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
            <SecondaryBtn onClick={() => onNavigate('browse')}>← Continue Browsing</SecondaryBtn>
            <SecondaryBtn onClick={() => onNavigate('cart')}>View Cart</SecondaryBtn>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Creator workflow screens ────────────────────────────────────────────────

function WorkflowBadge({ status, label }: { status: CustomWorkflowStatus; label?: string }) {
  const tone = getWorkflowTone(status)
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: tone.bg, color: tone.color, border: `1px solid ${tone.border}`, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: tone.color }} />{label ?? WORKFLOW_LABELS[status]}</span>
}

function CreatorDashboardScreen({ orders, onOpenTask }: { orders: OrderRecord[]; onOpenTask: (orderNumber: string, target: 'creator-request' | 'creator-order') => void }) {
  const tasks = getElenaTasks(orders)
  const incoming = tasks.filter(({ item }) => INCOMING_WORKFLOW_STATUSES.includes(getCustomWorkflow(item).status))
  const active = tasks.filter(({ item }) => ACTIVE_WORKFLOW_STATUSES.includes(getCustomWorkflow(item).status))
  const activeCount = active.filter(({ item }) => getCustomWorkflow(item).status !== 'shipped').length
  const awaitingCount = tasks.filter(({ item }) => getCustomWorkflow(item).status === 'awaiting-customer-review').length

  return (
    <div style={{ maxWidth: 1050, margin: '0 auto', padding: '48px 40px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 34 }}>
        <img src={CREATOR_IMG} alt="Elena Marsh" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${BORDER}` }} />
        <div><div style={{ fontSize: 12, color: ACCENT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Creator Dashboard</div><h1 style={{ fontSize: 28, color: INK, margin: '3px 0' }}>Elena Marsh</h1><div style={{ fontSize: 13, color: MUTED }}>Creator · Floral Painting</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 42 }}>
        {[['Incoming Requests', incoming.length], ['Active Orders', activeCount], ['Awaiting Customer Review', awaitingCount]].map(([label, value]) => <div key={String(label)} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '18px 20px' }}><div style={{ fontSize: 24, fontWeight: 700, color: INK, marginBottom: 4 }}>{value}</div><div style={{ fontSize: 12, color: MUTED }}>{label}</div></div>)}
      </div>

      <CreatorTaskSection title="Incoming Requests" empty="No incoming customized requests." tasks={incoming} actionLabel="View Request" onOpen={(number) => onOpenTask(number, 'creator-request')} />
      <div style={{ marginTop: 40 }}><CreatorTaskSection title="Active Orders" empty="No active customized orders." tasks={active} actionLabel="Open Order" onOpen={(number) => onOpenTask(number, 'creator-order')} /></div>
    </div>
  )
}

function CreatorTaskSection({ title, empty, tasks, actionLabel, onOpen }: { title: string; empty: string; tasks: CreatorTask[]; actionLabel: string; onOpen: (orderNumber: string) => void }) {
  return (
    <section>
      <h2 style={{ fontSize: 18, color: INK, marginBottom: 16 }}>{title}</h2>
      {tasks.length === 0 ? <div style={{ background: '#fff', border: `1px dashed ${BORDER}`, borderRadius: 8, padding: '30px 24px', color: MUTED, fontSize: 14 }}>{empty}</div> : <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{tasks.slice().reverse().map(({ order, item }) => {
        const workflow = getCustomWorkflow(item)
        return <div key={`${order.orderNumber}-${item.productId}`} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 18 }}>
          <img src={item.image} alt={item.title} style={{ width: 56, height: 68, objectFit: 'cover', borderRadius: 5 }} />
          <div style={{ flex: 1 }}><div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 5, flexWrap: 'wrap' }}><strong style={{ fontSize: 14, color: INK }}>{item.title}</strong><WorkflowBadge status={workflow.status} label={workflow.status === 'customer-response-sent' ? 'Customer Responded' : undefined} /></div><div style={{ fontSize: 12, color: MUTED, marginBottom: 3 }}>{order.orderNumber} · {order.checkout.name || 'Test User'} · {order.placedLabel}</div><div style={{ fontSize: 12, color: MUTED }}>{getCustomizationLabel(item)}</div></div>
          <PrimaryBtn small onClick={() => onOpen(order.orderNumber)}>{actionLabel}</PrimaryBtn>
        </div>
      })}</div>}
    </section>
  )
}

function CreatorRequestScreen({ task, onNavigate, onUpdateWorkflow }: { task?: CreatorTask; onNavigate: (s: Screen) => void; onUpdateWorkflow: (orderNumber: string, update: Partial<CustomWorkflow>) => void }) {
  const [showModification, setShowModification] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  if (!task?.item.customization) return <CreatorMissingState onNavigate={onNavigate} />
  const { order, item } = task
  const custom = item.customization!
  const workflow = getCustomWorkflow(item)

  const requestModification = () => {
    if (note.trim().length < 10) { setError('Please enter at least 10 characters so the customer knows what is needed.'); return }
    onUpdateWorkflow(order.orderNumber, { status: 'modification-requested', creatorModificationNote: note.trim(), customerModificationResponse: undefined, customerModificationUploads: undefined })
    setShowModification(false)
    setError('')
  }

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '48px 40px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 }}><div><div style={{ fontSize: 13, color: MUTED, marginBottom: 6 }}>{order.orderNumber}</div><h1 style={{ fontSize: 26, color: INK, margin: '0 0 10px' }}>Customized Request Details</h1><WorkflowBadge status={workflow.status} /></div></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '22px 24px' }}><h3 style={{ fontSize: 14, color: INK, marginBottom: 16 }}>Customer & Order</h3>{[['Customer', order.checkout.name || 'Test User'], ['Email', order.checkout.email], ['Placed', order.placedLabel], ['Delivery', order.delivery === 'express' ? 'Express Delivery' : 'Standard Delivery'], ['Quantity', String(item.quantity)], ['Item price', `€${item.unitPrice * item.quantity}`]].map(([label, value]) => <DetailRow key={label} label={label} value={value} />)}</div>
          <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '22px 24px' }}><h3 style={{ fontSize: 14, color: INK, marginBottom: 16 }}>Customization</h3>{[['Size', custom.size], ['Material', custom.material], ['Frame', custom.frame], ['Color palette', custom.palette], ['Orientation', custom.orientation]].map(([label, value]) => <DetailRow key={label} label={label} value={value} />)}</div>
          <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '22px 24px' }}><h3 style={{ fontSize: 14, color: INK, marginBottom: 14 }}>Reference Images</h3><div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{custom.uploads.map((upload, index) => <div key={upload.key}><img src={upload.src} alt={`Customer reference ${index + 1}`} style={{ width: 116, height: 116, objectFit: 'cover', borderRadius: 6, border: `1px solid ${BORDER}` }} /><div style={{ fontSize: 11, color: MUTED, marginTop: 4, maxWidth: 116, overflow: 'hidden', textOverflow: 'ellipsis' }}>{upload.name}</div></div>)}</div></div>
          <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '22px 24px' }}><h3 style={{ fontSize: 14, color: INK, marginBottom: 10 }}>Customer Instructions</h3><p style={{ fontSize: 14, color: MUTED, lineHeight: 1.7, margin: 0 }}>{custom.instruction || 'No additional instructions.'}</p></div>
          {workflow.status === 'customer-response-sent' && <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '22px 24px' }}><h3 style={{ fontSize: 14, color: INK, marginBottom: 16 }}>Clarification Exchange</h3><div style={{ marginBottom: 16 }}><div style={{ fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 6 }}>Your clarification request</div><p style={{ fontSize: 14, color: INK, lineHeight: 1.7, margin: 0 }}>{workflow.creatorModificationNote}</p></div><div><div style={{ fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 6 }}>Customer response</div><p style={{ fontSize: 14, color: INK, lineHeight: 1.7, margin: 0 }}>{workflow.customerModificationResponse}</p></div>{Boolean(workflow.customerModificationUploads?.length) && <div style={{ marginTop: 18 }}><div style={{ fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 10 }}>Supplemental images</div><div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{workflow.customerModificationUploads?.map((upload, index) => <div key={upload.key}><img src={upload.src} alt={`Customer supplemental reference ${index + 1}`} style={{ width: 116, height: 116, objectFit: 'cover', borderRadius: 6, border: `1px solid ${BORDER}` }} /><div style={{ fontSize: 11, color: MUTED, marginTop: 4, maxWidth: 116, overflow: 'hidden', textOverflow: 'ellipsis' }}>{upload.name}</div></div>)}</div></div>}</div>}
        </div>
        <div>
          <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '22px', position: 'sticky', top: 96 }}><img src={item.image} alt={item.title} style={{ width: '100%', height: 190, objectFit: 'cover', borderRadius: 6, marginBottom: 16 }} /><div style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 4 }}>{item.title}</div><div style={{ fontSize: 12, color: MUTED, marginBottom: 20 }}>{getCustomizationLabel(item)}</div>
            {workflow.creatorModificationNote && <div style={{ background: '#fef8e7', border: '1px solid #e8d98a', borderRadius: 6, padding: '12px', fontSize: 12, color: INK, lineHeight: 1.6, marginBottom: 16 }}><strong>Requested modification:</strong> {workflow.creatorModificationNote}</div>}
            <PrimaryBtn fullWidth onClick={() => { onUpdateWorkflow(order.orderNumber, { status: 'in-progress' }); onNavigate('creator-order') }}>Accept Request</PrimaryBtn>
            <div style={{ marginTop: 10 }}><SecondaryBtn fullWidth onClick={() => setShowModification(true)}>Request Modification</SecondaryBtn></div>
          </div>
        </div>
      </div>
      {showModification && <div style={{ maxWidth: 620, marginTop: 24, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '20px 24px' }}><h3 style={{ fontSize: 14, color: INK, marginBottom: 8 }}>What additional information is needed?</h3><textarea value={note} onChange={(e) => { setNote(e.target.value); setError('') }} rows={4} placeholder="Explain what the customer should clarify or provide." style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${error ? ERROR : BORDER}`, borderRadius: 6, padding: 12, fontFamily: 'Inter, sans-serif', fontSize: 14, resize: 'vertical' }} />{error && <div style={{ fontSize: 12, color: ERROR, marginTop: 5 }}>{error}</div>}<div style={{ display: 'flex', gap: 10, marginTop: 14 }}><PrimaryBtn small onClick={requestModification}>Send Request</PrimaryBtn><SecondaryBtn small onClick={() => { setShowModification(false); setNote(''); setError('') }}>Cancel</SecondaryBtn></div></div>}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, fontSize: 13, marginBottom: 9 }}><span style={{ color: MUTED }}>{label}</span><span style={{ color: INK, fontWeight: 500, textAlign: 'right' }}>{value}</span></div>
}

function CreatorOrderScreen({ task, onNavigate, onUpdateWorkflow }: { task?: CreatorTask; onNavigate: (s: Screen) => void; onUpdateWorkflow: (orderNumber: string, update: Partial<CustomWorkflow>) => void }) {
  const item = task?.item
  const order = task?.order
  const workflow = item ? getCustomWorkflow(item) : undefined
  const [progressImage, setProgressImage] = useState(workflow?.progressImage ?? '')
  const [progressImageName, setProgressImageName] = useState(workflow?.progressImageName ?? '')
  const [progressNote, setProgressNote] = useState(workflow?.progressNote ?? '')
  const [progressError, setProgressError] = useState('')
  const [carrier, setCarrier] = useState(workflow?.carrier ?? '')
  const [trackingNumber, setTrackingNumber] = useState(workflow?.trackingNumber ?? '')
  const [shippingError, setShippingError] = useState('')
  if (!item?.customization || !order || !workflow) return <CreatorMissingState onNavigate={onNavigate} />

  const handleProgressFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) { setProgressError('Please choose an image file.'); return }
    const reader = new FileReader()
    reader.onload = () => { setProgressImage(reader.result as string); setProgressImageName(file.name); setProgressError('') }
    reader.readAsDataURL(file)
  }
  const submitProgress = () => {
    if (!progressImage) { setProgressError('Add a progress image before submitting.'); return }
    if (progressNote.trim().length < 10) { setProgressError('Enter a progress note of at least 10 characters.'); return }
    onUpdateWorkflow(order.orderNumber, { status: 'awaiting-customer-review', progressImage, progressImageName, progressNote })
    setProgressError('')
  }
  const markShipped = () => {
    if (!carrier.trim() || !trackingNumber.trim()) { setShippingError('Carrier and tracking number are both required.'); return }
    onUpdateWorkflow(order.orderNumber, { status: 'shipped', carrier, trackingNumber })
    setShippingError('')
  }

  const canSubmitProgress = workflow.status === 'in-progress' || workflow.status === 'changes-requested'
  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '48px 40px 80px' }}>
      <div style={{ marginBottom: 30 }}><div style={{ fontSize: 13, color: MUTED, marginBottom: 5 }}>{order.orderNumber} · {order.checkout.name || 'Test User'}</div><h1 style={{ fontSize: 26, color: INK, margin: '0 0 10px' }}>Creator Order</h1><WorkflowBadge status={workflow.status} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32 }}>
        <div>
          {workflow.status === 'changes-requested' && <div style={{ background: '#fdf0ef', border: '1px solid #e8b4b0', borderRadius: 8, padding: '20px 22px', marginBottom: 20 }}><h3 style={{ fontSize: 15, color: ERROR, marginBottom: 8 }}>Changes Requested</h3><p style={{ fontSize: 14, color: INK, lineHeight: 1.65, margin: 0 }}>{workflow.customerFeedback}</p></div>}
          {canSubmitProgress && <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '24px' }}><h3 style={{ fontSize: 16, color: INK, marginBottom: 18 }}>{workflow.status === 'changes-requested' ? 'Submit Revised Progress' : 'Progress Update'}</h3>
            {progressImage && <img src={progressImage} alt="Selected floral artwork progress" style={{ width: '100%', height: 280, objectFit: 'cover', borderRadius: 6, marginBottom: 14 }} />}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}><label style={{ display: 'inline-flex', alignItems: 'center', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '8px 14px', fontSize: 13, color: INK, cursor: 'pointer', background: '#fff' }}>Upload Progress Image<input type="file" accept="image/*" onChange={handleProgressFile} style={{ display: 'none' }} /></label><SecondaryBtn small onClick={() => { setProgressImage(PROGRESS_IMG); setProgressImageName('floral-painting-progress.png'); setProgressError('') }}>Use Sample Progress Image</SecondaryBtn></div>
            {progressImageName && <div style={{ fontSize: 12, color: MUTED, marginBottom: 12 }}>Selected: {progressImageName}</div>}
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: INK, marginBottom: 6 }}>Progress Note</label><textarea value={progressNote} onChange={(e) => { setProgressNote(e.target.value); setProgressError('') }} rows={5} placeholder="Describe the current progress and what you would like the customer to review." style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${progressError ? ERROR : BORDER}`, borderRadius: 6, padding: 12, fontFamily: 'Inter, sans-serif', fontSize: 14, resize: 'vertical' }} />{progressError && <div style={{ fontSize: 12, color: ERROR, marginTop: 5 }}>{progressError}</div>}<div style={{ marginTop: 16 }}><PrimaryBtn onClick={submitProgress}>Submit for Customer Review</PrimaryBtn></div>
          </div>}

          {workflow.status === 'awaiting-customer-review' && <WorkflowMessage title="Awaiting Customer Review" body="The saved progress image and note are now visible to the customer." />}
          {workflow.status === 'progress-approved' && <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '24px' }}><WorkflowMessage title="Progress Approved" body="The customer approved this progress update. You can now complete the artwork." /><div style={{ marginTop: 18 }}><PrimaryBtn onClick={() => onUpdateWorkflow(order.orderNumber, { status: 'completed' })}>Mark Artwork as Completed</PrimaryBtn></div></div>}
          {workflow.status === 'completed' && <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '24px' }}><h3 style={{ fontSize: 16, color: INK, marginBottom: 8 }}>Artwork Completed</h3><p style={{ fontSize: 14, color: MUTED, margin: '0 0 20px' }}>Add shipment details when the artwork is dispatched.</p><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Carrier</label><input value={carrier} onChange={(e) => { setCarrier(e.target.value); setShippingError('') }} placeholder="e.g. DHL Express" style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${BORDER}`, borderRadius: 6, padding: 11, fontSize: 14, marginBottom: 14 }} /><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Tracking Number</label><input value={trackingNumber} onChange={(e) => { setTrackingNumber(e.target.value); setShippingError('') }} placeholder="Enter tracking number" style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${BORDER}`, borderRadius: 6, padding: 11, fontSize: 14 }} />{shippingError && <div style={{ fontSize: 12, color: ERROR, marginTop: 6 }}>{shippingError}</div>}<div style={{ marginTop: 18 }}><PrimaryBtn onClick={markShipped}>Mark as Shipped</PrimaryBtn></div></div>}
          {workflow.status === 'shipped' && <div style={{ background: '#f0f5f2', border: `1px solid #b2d0c4`, borderRadius: 8, padding: '24px' }}><h3 style={{ fontSize: 16, color: INK, marginBottom: 14 }}>Shipment Recorded</h3><DetailRow label="Carrier" value={workflow.carrier ?? ''} /><DetailRow label="Tracking number" value={workflow.trackingNumber ?? ''} /></div>}
          {INCOMING_WORKFLOW_STATUSES.includes(workflow.status) && <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '24px' }}><p style={{ fontSize: 14, color: MUTED, margin: '0 0 16px' }}>This request has not been accepted yet.</p><PrimaryBtn onClick={() => onNavigate('creator-request')}>View Request Details</PrimaryBtn></div>}
        </div>
        <div><div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '20px', marginBottom: 18 }}><img src={item.image} alt={item.title} style={{ width: '100%', height: 170, objectFit: 'cover', borderRadius: 6, marginBottom: 14 }} /><div style={{ fontSize: 15, fontWeight: 600, marginBottom: 5 }}>{item.title}</div><div style={{ fontSize: 12, color: MUTED, lineHeight: 1.6 }}>{getCustomizationLabel(item)}</div></div><div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '20px' }}><h3 style={{ fontSize: 14, color: INK, marginBottom: 10 }}>Customer Context</h3><p style={{ fontSize: 12, color: MUTED, lineHeight: 1.65, margin: '0 0 12px' }}>{item.customization.instruction}</p><div style={{ fontSize: 12, color: MUTED }}>{item.customization.uploads.length} reference image{item.customization.uploads.length === 1 ? '' : 's'}</div></div></div>
      </div>
    </div>
  )
}

function CreatorMissingState({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  return <div style={{ maxWidth: 680, margin: '0 auto', padding: '80px 40px', textAlign: 'center' }}><h1 style={{ fontSize: 24, color: INK, marginBottom: 10 }}>Creator task not found</h1><p style={{ fontSize: 14, color: MUTED, marginBottom: 22 }}>Return to the dashboard and choose an available customized order.</p><PrimaryBtn onClick={() => onNavigate('creator-dashboard')}>Creator Dashboard</PrimaryBtn></div>
}

// ─── Screen: Login ────────────────────────────────────────────────────────────

const PROTOTYPE_ACCOUNTS: Array<SessionUser & { password: string }> = [
  { role: 'customer', name: 'Test User', email: 'test@artian.com', password: '1234' },
  { role: 'creator', name: 'Elena Marsh', email: 'elena@artian.com', password: '1234' },
]

function LoginScreen({ onLogin, onCancel, context }: { onLogin: (user: SessionUser) => void; onCancel: () => void; context: LoginIntent }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailErr, setEmailErr] = useState('')
  const [passErr, setPassErr] = useState('')
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = () => {
    let ok = true
    const account = PROTOTYPE_ACCOUNTS.find((candidate) => candidate.email === email.trim().toLowerCase())
    if (!email.trim()) { setEmailErr('Email is required.'); ok = false }
    else if (!account) { setEmailErr('No prototype account found with this email.'); ok = false }
    else setEmailErr('')
    if (!password) { setPassErr('Password is required.'); ok = false }
    else if (!account || password !== account.password) { setPassErr('Incorrect password.'); ok = false }
    else setPassErr('')
    if (ok && account) onLogin({ role: account.role, name: account.name, email: account.email })
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: PAGE_BG, padding: '40px 24px' }}>
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '48px 44px', width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: INK, marginBottom: 8, letterSpacing: '-0.3px' }}>Log in to Artian</h1>
          <p style={{ fontSize: 14, color: MUTED }}>{context === 'checkout' ? 'Please log in as a customer to continue to checkout.' : 'Access customer orders or the creator workspace.'}</p>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: INK, display: 'block', marginBottom: 6 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (emailErr) setEmailErr('') }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="test@artian.com"
            style={{ width: '100%', border: `1px solid ${emailErr ? ERROR : BORDER}`, borderRadius: 6, padding: '10px 12px', fontSize: 14, color: INK, background: '#fff', boxSizing: 'border-box' }}
          />
          {emailErr && <div style={{ fontSize: 12, color: ERROR, marginTop: 5 }}>{emailErr}</div>}
        </div>

        <div style={{ marginBottom: 28 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: INK, display: 'block', marginBottom: 6 }}>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (passErr) setPassErr('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="••••••••"
              style={{ width: '100%', border: `1px solid ${passErr ? ERROR : BORDER}`, borderRadius: 6, padding: '10px 40px 10px 12px', fontSize: 14, color: INK, background: '#fff', boxSizing: 'border-box' }}
            />
            <button onClick={() => setShowPass((v) => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: MUTED, padding: 4 }}>
              {showPass
                ? <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23" /></svg>
                : <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>}
            </button>
          </div>
          {passErr && <div style={{ fontSize: 12, color: ERROR, marginTop: 5 }}>{passErr}</div>}
        </div>

        <PrimaryBtn onClick={handleSubmit} fullWidth>Log In</PrimaryBtn>

        <div style={{ marginTop: 20, padding: '14px 16px', background: SURFACE, borderRadius: 6, border: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>Prototype credentials</div>
          <div style={{ fontSize: 13, color: INK, marginBottom: 5 }}><strong>Customer:</strong> <span style={{ fontFamily: 'monospace', color: ACCENT }}>test@artian.com / 1234</span></div>
          <div style={{ fontSize: 13, color: INK }}><strong>Creator:</strong> <span style={{ fontFamily: 'monospace', color: ACCENT }}>elena@artian.com / 1234</span></div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', fontSize: 13, color: MUTED, cursor: 'pointer', textDecoration: 'underline' }}>{context === 'checkout' ? 'Return to Cart' : 'Continue without logging in'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Screen: My Orders ────────────────────────────────────────────────────────

function MyOrdersScreen({ orders, onNavigate, onViewOrder }: { orders: OrderRecord[]; onNavigate: (s: Screen) => void; onViewOrder: (orderNumber: string) => void }) {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '64px 40px 80px' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: INK, letterSpacing: '-0.3px', marginBottom: 8 }}>My Orders</h1>
      <p style={{ fontSize: 14, color: MUTED, marginBottom: 40 }}>View and track your saved prototype orders.</p>

      {orders.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 40px', border: `1px solid ${BORDER}`, borderRadius: 10, textAlign: 'center', background: SURFACE }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <svg width="24" height="24" fill="none" stroke={MUTED} strokeWidth={1.5} viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" ry="1" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" /></svg>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: INK, marginBottom: 8 }}>No orders yet</div>
          <div style={{ fontSize: 14, color: MUTED, maxWidth: 340, lineHeight: 1.6, marginBottom: 28 }}>
            When you place an order, it will appear here with the purchased items and delivery details.
          </div>
          <PrimaryBtn onClick={() => onNavigate('browse')}>Browse Products</PrimaryBtn>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {orders.slice().reverse().map((order) => {
            const firstItem = order.items[0]
            const additionalItems = order.items.length - 1
            const customItem = order.items.find((item) => item.customized && item.customization)
            const displayStatus = getOrderDisplayStatus(order)
            const tone = customItem ? getWorkflowTone(getCustomWorkflow(customItem).status) : { bg: '#e8f0ec', color: ACCENT, border: '#b2d0c4' }
            return (
              <div key={order.orderNumber} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '24px 28px', borderBottom: `1px solid ${BORDER}` }}>
                  <img src={firstItem.image} alt={firstItem.title} style={{ width: 56, height: 68, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: INK }}>{firstItem.title}</span>
                      {additionalItems > 0 && <span style={{ fontSize: 12, color: MUTED }}>+ {additionalItems} more item{additionalItems === 1 ? '' : 's'}</span>}
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: tone.bg, color: tone.color, border: `1px solid ${tone.border}`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: tone.color, display: 'inline-block' }} />
                        {displayStatus}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: MUTED, marginBottom: 2 }}>by {firstItem.creator} · Order {order.orderNumber}</div>
                    <div style={{ fontSize: 12, color: MUTED }}>{firstItem.customized ? getCustomizationLabel(firstItem) : `Quantity ${firstItem.quantity}`}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: INK, marginBottom: 4 }}>€{order.total}</div>
                    <div style={{ fontSize: 12, color: MUTED }}>{order.delivery === 'express' ? 'Express' : 'Standard'} delivery</div>
                  </div>
                </div>

                <div style={{ padding: '16px 28px', background: SURFACE, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, color: MUTED }}>{order.placedLabel} · Estimated {order.delivery === 'express' ? '7–10' : '14–21'} business days</div>
                  <PrimaryBtn small onClick={() => onViewOrder(order.orderNumber)}>{customItem ? 'Track Order' : 'View Order'}</PrimaryBtn>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [history, setHistory] = useState<Screen[]>([])
  const [cfg, setCfgState] = useState<AppConfig>(DEFAULT_CONFIG)
  const [session, setSession] = useState<SessionUser | null>(null)
  const [loginIntent, setLoginIntent] = useState<LoginIntent>(null)

  const setCfg: SetAppConfig = (update) =>
    setCfgState((prev) => ({ ...prev, ...(typeof update === 'function' ? update(prev) : update) }))

  const replaceScreen = (next: Screen) => {
    setScreen(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const navigate = (requested: Screen) => {
    let target = requested
    if (requested === 'checkout' && session?.role !== 'customer') {
      setLoginIntent('checkout')
      target = 'login'
    } else if (requested === 'my-orders' && session?.role !== 'customer') {
      setLoginIntent('my-orders')
      target = 'login'
    } else if ((requested === 'creator-dashboard' || requested === 'creator-request' || requested === 'creator-order') && session?.role !== 'creator') {
      setLoginIntent(null)
      target = 'login'
    }
    if (target === screen) return
    setHistory((prev) => prev[prev.length - 1] === screen ? prev : [...prev, screen])
    replaceScreen(target)
  }

  const goBack = () => {
    if (history.length === 0) return
    const previous = history[history.length - 1]
    setHistory(history.slice(0, -1))
    replaceScreen(previous)
  }

  const handleLogin = (user: SessionUser) => {
    const intended = loginIntent
    setSession(user)
    setLoginIntent(null)
    if (user.role === 'creator') {
      setHistory([])
      replaceScreen('creator-dashboard')
      return
    }
    setCfg((prev) => ({ checkout: { ...prev.checkout, email: prev.checkout.email || user.email, name: prev.checkout.name || user.name } }))
    replaceScreen(intended === 'checkout' ? 'checkout' : 'my-orders')
  }

  const handleLogout = () => {
    setSession(null)
    setLoginIntent(null)
    setHistory([])
    replaceScreen('home')
  }

  const currentOrder = cfg.orders.find((order) => order.orderNumber === cfg.currentOrderNumber) ?? cfg.orders[cfg.orders.length - 1]

  const viewOrder = (orderNumber: string) => {
    setCfg({ currentOrderNumber: orderNumber })
    navigate('order-status')
  }

  const updateWorkflow = (orderNumber: string, update: Partial<CustomWorkflow>) => {
    setCfgState((prev) => ({
      ...prev,
      orders: prev.orders.map((order) => order.orderNumber !== orderNumber ? order : {
        ...order,
        items: order.items.map((item) => isElenaCustomizedItem(item) ? { ...item, workflow: { ...getCustomWorkflow(item), ...update } } : item),
      }),
    }))
  }

  const openCreatorTask = (orderNumber: string, target: 'creator-request' | 'creator-order') => {
    setCfg({ currentOrderNumber: orderNumber })
    navigate(target)
  }

  const currentCreatorTask = currentOrder
    ? getElenaTasks([currentOrder])[0]
    : undefined

  const requireCustomer = () => {
    setLoginIntent('checkout')
    replaceScreen('login')
  }

  const cancelLogin = () => {
    setLoginIntent(null)
    if (history.length > 0) goBack()
    else replaceScreen('home')
  }

  const props = { cfg, setCfg, onNavigate: navigate }

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG, color: INK }}>
      <Header screen={screen} cartCount={(cfg.cartActive ? 1 : 0) + cfg.simpleCartItems.length} wishlistCount={cfg.wishlist.length} session={session} onLogout={handleLogout} onNavigate={navigate} />
      {screen !== 'home' && history.length > 0 && <div style={{ maxWidth: 1200, margin: '0 auto', padding: '18px 40px 0' }}><button onClick={goBack} style={{ background: 'none', border: 'none', padding: 0, color: MUTED, fontSize: 13, cursor: 'pointer' }}>← Back</button></div>}
      {screen === 'home' && <HomeScreen onNavigate={navigate} onSelectProduct={(id) => setCfg({ selectedProductId: id })} />}
      {screen === 'browse' && <BrowseScreen onNavigate={navigate} onSelectProduct={(id) => setCfg({ selectedProductId: id })} />}
      {screen === 'product' && <ProductScreen cfg={cfg} setCfg={setCfg} onNavigate={navigate} />}
      {screen === 'customize-options' && <CustomizeOptionsScreen {...props} />}
      {screen === 'customize-references' && <CustomizeReferencesScreen {...props} />}
      {screen === 'customize-review' && <ReviewScreen {...props} />}
      {screen === 'cart' && <CartScreen {...props} />}
      {screen === 'checkout' && session?.role === 'customer' && <CheckoutScreen {...props} session={session} onRequireCustomer={requireCustomer} />}
      {screen === 'checkout' && session?.role !== 'customer' && <LoginScreen onLogin={handleLogin} onCancel={cancelLogin} context="checkout" />}
      {screen === 'confirmation' && <ConfirmationScreen order={currentOrder} onNavigate={navigate} onViewOrder={viewOrder} />}
      {screen === 'order-status' && <OrderStatusScreen key={currentOrder?.orderNumber} order={currentOrder} onNavigate={navigate} onUpdateWorkflow={updateWorkflow} />}
      {screen === 'wishlist' && <WishlistScreen cfg={cfg} setCfg={setCfg} onNavigate={navigate} onSelectProduct={(id) => setCfg({ selectedProductId: id })} />}
      {screen === 'creators' && <CreatorsScreen onNavigate={navigate} onSelectProduct={(id) => setCfg({ selectedProductId: id })} />}
      {screen === 'login' && <LoginScreen onLogin={handleLogin} onCancel={cancelLogin} context={loginIntent} />}
      {screen === 'my-orders' && session?.role === 'customer' && <MyOrdersScreen orders={cfg.orders} onNavigate={navigate} onViewOrder={viewOrder} />}
      {screen === 'creator-dashboard' && session?.role === 'creator' && <CreatorDashboardScreen orders={cfg.orders} onOpenTask={openCreatorTask} />}
      {screen === 'creator-request' && session?.role === 'creator' && <CreatorRequestScreen key={currentOrder?.orderNumber} task={currentCreatorTask} onNavigate={navigate} onUpdateWorkflow={updateWorkflow} />}
      {screen === 'creator-order' && session?.role === 'creator' && <CreatorOrderScreen key={`${currentOrder?.orderNumber}-${currentCreatorTask ? getCustomWorkflow(currentCreatorTask.item).status : 'missing'}`} task={currentCreatorTask} onNavigate={navigate} onUpdateWorkflow={updateWorkflow} />}
    </div>
  )
}
