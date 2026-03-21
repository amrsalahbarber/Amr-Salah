import React, { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSettings } from '@/db/hooks/useSettings'

interface ReceiptItem {
  name: string
  price: number
}

interface ReceiptProps {
  clientName: string
  clientPhone?: string
  barberName?: string
  transactionId: string
  date: string
  time: string
  items: ReceiptItem[]
  subtotal: number
  discount: number
  discountType: 'percentage' | 'fixed'
  total: number
  paymentMethod: string
}

// Convert numbers to Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩)
const toArabicNumerals = (n: number | string): string => {
  return String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d])
}

// Map payment methods to Arabic
const paymentMethodMap: Record<string, string> = {
  cash: 'نقداً',
  card: 'بطاقة بنكية',
  wallet: 'محفظة إلكترونية',
}

export const ReceiptTemplate = React.forwardRef<HTMLDivElement, ReceiptProps>(
  (
    {
      clientName,
      clientPhone,
      barberName,
      transactionId,
      date,
      time,
      items,
      subtotal,
      discount,
      discountType,
      total,
      paymentMethod,
    },
    ref
  ) => {
    const { shopId } = useAuth()
    const { getSetting } = useSettings()
    const [shopName, setShopName] = useState<string>('')
    const [shopPhone, setShopPhone] = useState<string>('')

    // Fetch shop settings
    useEffect(() => {
      const name = getSetting('barbershipName', 'محل الحلاقة')
      const phone = getSetting('barbershipPhone', '')
      setShopName(name)
      setShopPhone(phone)
    }, [shopId])

    // Extract last 4 characters from transaction ID
    const receiptNumber = transactionId.slice(-4).toUpperCase()

    // Format discount display
    const discountLabel =
      discountType === 'percentage'
        ? `${toArabicNumerals(discount)}%`
        : `${toArabicNumerals(discount.toFixed(2))} ج.م`

    return (
      <div
        ref={ref}
        id="receipt-container"
        className="bg-white text-black p-0"
        style={{
          width: '80mm',
          fontFamily: "'Cairo', 'Arial', monospace",
          direction: 'rtl',
          textAlign: 'right',
          fontSize: '12px',
          lineHeight: '1.6',
        }}
      >
        <style>{`
          @media print {
            body > *:not(#receipt-container) { display: none !important; }
            #receipt-container { 
              width: 80mm;
              font-family: 'Cairo', 'Arial', monospace;
              direction: rtl;
              margin: 0;
              padding: 0;
            }
            .receipt-divider { 
              border-bottom: 1px solid #000;
              margin: 8px 0;
              padding: 0;
            }
          }
        `}</style>

        {/* Header with Separator */}
        <div style={{ textAlign: 'center', marginBottom: '8px', paddingBottom: '8px', borderBottom: '2px solid #000' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
            ✂️ {shopName} ✂️
          </div>
          {shopPhone && (
            <div style={{ fontSize: '11px', marginBottom: '2px' }}>📞 {shopPhone}</div>
          )}
        </div>

        {/* Receipt Title */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold' }}>فاتورة ضريبية مبسطة</div>
          <div style={{ fontSize: '10px', marginTop: '2px' }}>
            رقم الفاتورة: #{toArabicNumerals(receiptNumber)}
          </div>
        </div>

        {/* Divider */}
        <div className="receipt-divider" style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />

        {/* Date & Time */}
        <div style={{ textAlign: 'center', fontSize: '10px', marginBottom: '6px' }}>
          <div>التاريخ: {date}</div>
          <div>الوقت: {time}</div>
        </div>

        {/* Divider */}
        <div className="receipt-divider" style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />

        {/* Client Info */}
        <div style={{ marginBottom: '6px', fontSize: '11px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span>{clientName}</span>
            <span style={{ fontWeight: 'bold' }}>العميل :</span>
          </div>
          {clientPhone && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>{clientPhone}</span>
              <span style={{ fontWeight: 'bold' }}>الهاتف :</span>
            </div>
          )}
        </div>

        {/* Barber Info */}
        {barberName && (
          <>
            <div className="receipt-divider" style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />
            <div style={{ marginBottom: '6px', fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{barberName}</span>
                <span style={{ fontWeight: 'bold' }}>الحلاق :</span>
              </div>
            </div>
          </>
        )}

        {/* Divider */}
        <div className="receipt-divider" style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />

        {/* Services Header */}
        <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' }}>الخدمات:</div>

        {/* Services Divider */}
        <div style={{ borderBottom: '1px dotted #000', margin: '4px 0' }} />

        {/* Services List */}
        <div style={{ marginBottom: '6px' }}>
          {items.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px',
                marginBottom: '2px',
              }}
            >
              <span style={{ fontWeight: 'bold' }}>{toArabicNumerals(item.price.toFixed(2))} ج.م</span>
              <span>{item.name}</span>
            </div>
          ))}
        </div>

        {/* Services Divider */}
        <div style={{ borderBottom: '1px dotted #000', margin: '4px 0' }} />

        {/* Totals */}
        <div style={{ marginBottom: '6px', fontSize: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span style={{ fontWeight: 'bold' }}>{toArabicNumerals(subtotal.toFixed(2))} ج.م</span>
            <span>المجموع:</span>
          </div>
          {discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c41e3a' }}>
              <span style={{ fontWeight: 'bold' }}>-{toArabicNumerals(discount.toFixed(2))} ج.م</span>
              <span>الخصم ({discountLabel}):</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="receipt-divider" style={{ borderBottom: '2px solid #000', margin: '8px 0' }} />

        {/* Grand Total */}
        <div
          style={{
            textAlign: 'center',
            fontSize: '16px',
            fontWeight: 'bold',
            marginBottom: '8px',
            padding: '4px 0',
          }}
        >
          💰 الإجمالي: {toArabicNumerals(total.toFixed(2))} ج.م
        </div>

        {/* Divider */}
        <div className="receipt-divider" style={{ borderBottom: '2px solid #000', margin: '8px 0' }} />

        {/* Payment Method */}
        <div style={{ textAlign: 'center', marginBottom: '8px', fontSize: '10px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>طريقة الدفع:</div>
          <div>{paymentMethodMap[paymentMethod] || paymentMethod}</div>
        </div>

        {/* Divider */}
        <div className="receipt-divider" style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />

        {/* Thank You Message */}
        <div style={{ textAlign: 'center', fontSize: '10px', marginBottom: '8px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>شكراً لكم على ثقتكم 🙏</div>
          <div>نتطلع لخدمتكم مرة أخرى</div>
        </div>

        {/* Divider */}
        <div className="receipt-divider" style={{ borderBottom: '1px solid #000', margin: '6px 0' }} />

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '8px', marginTop: '8px', paddingTop: '4px', borderTop: '1px solid #000' }}>
          <div style={{ letterSpacing: '2px', marginBottom: '2px' }}>─────────────────────</div>
          <div style={{ fontWeight: 'bold', marginBottom: '1px' }}>YoussefAhmed</div>
          <div style={{ marginBottom: '2px' }}>01000139417</div>
          <div style={{ marginBottom: '2px' }}>Powered by YA Tech</div>
          <div style={{ letterSpacing: '2px' }}>─────────────────────</div>
        </div>
      </div>
    )
  }
)

ReceiptTemplate.displayName = 'ReceiptTemplate'
