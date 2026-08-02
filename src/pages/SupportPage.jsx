import React, { useState } from 'react';
import { 
  Search, 
  Coffee, 
  CreditCard, 
  Calendar, 
  Truck, 
  ChevronDown, 
  ChevronUp, 
  Upload, 
  Send, 
  Clock, 
  Mail,
  Phone,
  CheckCircle2,
  HelpCircle,
  Sparkles
} from 'lucide-react';

export default function SupportPage({setPage}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState(null);

  const [ticketForm, setTicketForm] = useState({
    category: 'Order Issues',
    orderId: '',
    message: '',
    screenshot: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [myTickets, setMyTickets] = useState([
    {
      id: '1024',
      category: 'Missing Item',
      status: 'In Progress',
      statusClass: 'status-progress',
      lastUpdate: 'We are checking with the kitchen',
      date: 'Today, 2:45 PM'
    }
  ]);

  const faqs = [
    {
      q: 'How do I track my active coffee order?',
      a: 'You can track your order in real-time by heading to the profile section of the app and tapping on "Active Orders". You will see live status updates from brewing to delivery.'
    },
    {
      q: 'Can I cancel or modify my order after placing it?',
      a: 'Orders can be cancelled within 2 minutes of placement directly through the app. After brewing starts, cancellations are no longer available to prevent food waste.'
    },
    {
      q: 'How long do refunds take to process?',
      a: 'Approved refunds are processed instantly on our end, but may take 3-5 business days to reflect in your bank account depending on your payment provider.'
    },
    {
      q: 'How do I reserve a table at the cafe?',
      a: 'Navigate to the Reservations tab in the app, select your preferred date, time, and party size, and instantly secure your table.'
    }
  ];

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleTicketSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    setTimeout(() => {
      const newTicketId = Math.floor(1000 + Math.random() * 9000).toString();
      const newTicket = {
        id: newTicketId,
        category: ticketForm.category,
        status: 'In Progress',
        statusClass: 'status-progress',
        lastUpdate: 'Ticket received. Our support team is on it!',
        date: 'Just now'
      };

      setMyTickets([newTicket, ...myTickets]);
      setIsSubmitting(false);
      setSubmitSuccess(true);
      setTicketForm({ category: 'Order Issues', orderId: '', message: '', screenshot: null });

      setTimeout(() => setSubmitSuccess(false), 5000);
    }, 1000);
  };

  return (
    <div className="support-page">
      <style>{`
        /* ================================
           BREWED SUPPORT PAGE
           ================================ */

        .support-page {
          min-height: 100vh;
          background: #FDFAF5;
          color: #2C221E;
          font-family: "Inter", sans-serif;
          padding-bottom: 80px;
        }

        /* HERO */
        .support-hero {
          background: linear-gradient(
            180deg,
            #2C221E,
            #3D2F2A
          );
          color: #FAF6F0;
          padding: 70px 20px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .support-hero h1 {
          font-size: 3rem;
          font-weight: 700;
        }

        .support-hero p {
          color: #C4B9B0;
          max-width: 550px;
          margin: 15px auto;
        }

        /* SEARCH */
        .support-search {
          max-width: 600px;
          margin: 25px auto 0;
          position: relative;
        }

        .support-search input {
          width: 100%;
          padding: 16px 20px 16px 50px;
          border-radius: 18px;
          background: #211A17;
          border: 1px solid #4A3B34;
          color: white;
          outline: none;
        }

        .support-search input:focus {
          border-color: #C4956A;
        }

        /* MAIN CONTAINER */
        .support-container {
          max-width: 1200px;
          margin: -35px auto 0;
          padding: 0 20px;
          position: relative;
          z-index: 20;
        }

        /* CARDS */
        .support-card {
          background: white;
          border-radius: 22px;
          padding: 25px;
          border: 1px solid #EFECE6;
          transition: .3s ease;
        }

        .support-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 30px rgba(0,0,0,.08);
        }

        .support-icon {
          width: 50px;
          height: 50px;
          border-radius: 14px;
          background: #FDF6F0;
          color: #C87941;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
        }

        /* FAQ */
        .faq-item {
          background: white;
          border-radius: 18px;
          border: 1px solid #EFECE6;
          overflow: hidden;
          margin-bottom: 12px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }

        .faq-question {
          width: 100%;
          padding: 18px 22px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: white;
          border: none;
          cursor: pointer;
          font-weight: 600;
          color: #2C221E;
          text-align: left;
        }

        .faq-question:hover {
          background: rgba(250, 246, 240, 0.5);
        }

        .faq-answer {
          padding: 0 22px 20px;
          color: #6B5E55;
          font-size: .9rem;
          border-top: 1px solid #F5F2EC;
          background: rgba(250, 246, 240, 0.4);
          padding-top: 10px;
        }

        /* TICKET FORM */
        .ticket-box {
          background: white;
          border-radius: 28px;
          padding: 35px;
          border: 1px solid #EFECE6;
        }

        .ticket-input,
        .ticket-textarea,
        .ticket-select {
          width: 100%;
          padding: 14px 16px;
          background: #FAF6F0;
          border: 1px solid #EFECE6;
          border-radius: 14px;
          outline: none;
          color: #2C221E;
          font-size: 0.875rem;
        }

        .ticket-input:focus,
        .ticket-textarea:focus,
        .ticket-select:focus {
          border-color: #C87941;
          box-shadow: 0 0 0 2px rgba(200, 121, 65, 0.2);
        }

        /* BUTTON */
        .support-btn {
          width: 100%;
          padding: 16px;
          background: #C87941;
          color: white;
          border: none;
          border-radius: 18px;
          font-weight: 700;
          cursor: pointer;
          transition: .3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .support-btn:hover {
          background: #B36833;
        }

        .support-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* CONTACT */
        .contact-section {
          background: #2C221E;
          color: #FAF6F0;
          border-radius: 28px;
          padding: 35px;
        }

        .contact-item {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .contact-item svg {
          color: #C87941;
        }

        /* STATUS BADGES */
        .status-open {
          background: #FEF3C7;
          color: #92400E;
        }

        .status-progress {
          background: #DBEAFE;
          color: #1D4ED8;
        }

        .status-resolved {
          background: #DCFCE7;
          color: #166534;
        }

        .status-badge {
          padding: 6px 12px;
          border-radius: 999px;
          font-size: .75rem;
          font-weight: 600;
          display: inline-block;
          border: 1px solid transparent;
        }

        /* MOBILE */
        @media(max-width: 768px) {
          .support-hero h1 {
            font-size: 2.2rem;
          }

          .ticket-box,
          .contact-section {
            padding: 22px;
          }

          .support-container {
            padding: 0 15px;
          }
        }
      `}</style>
      
      {/* 📞 HERO SECTION */}
      <section className="support-hero">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#C87941_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="max-w-3xl mx-auto relative z-10 space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-[#C87941]/20 text-[#E29862] rounded-full text-xs font-semibold tracking-wider uppercase border border-[#C87941]/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Brewed Support Desk</span>
          </div>

          <h1 className="tracking-tight">
            How can we help? <span className="inline-block animate-bounce">☕</span>
          </h1>
          
          <p className="text-sm md:text-base max-w-lg mx-auto">
            Search our instant knowledge base or drop us a ticket below. We've got your caffeine cravings covered.
          </p>

          {/* Search FAQ Bar */}
          <div className="support-search">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-[#9E9085]">
              <Search className="w-5 h-5 text-[#C87941]" />
            </span>
            <input
              type="text"
              placeholder="Search for answers (e.g. refund, missing item, delivery)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      <main className="support-container space-y-12">

        {/* ☕ 2. QUICK ACTIONS (4 CARDS) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: Order Issues */}
          <div className="support-card group">
            <div className="support-icon group-hover:bg-[#C87941] group-hover:text-white transition-colors">
              <Coffee className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg mb-3 text-[#2C221E]">Order Issues</h3>
            <ul className="space-y-2 text-sm text-[#6B5E55]">
              <li><button onClick={() => setTicketForm({...ticketForm, category: 'Order Issues'})} className="hover:text-[#C87941] hover:underline text-left block w-full">Track Order</button></li>
              <li><button onClick={() => setTicketForm({...ticketForm, category: 'Order Issues'})} className="hover:text-[#C87941] hover:underline text-left block w-full">Cancel Order</button></li>
              <li><button onClick={() => setTicketForm({...ticketForm, category: 'Order Issues'})} className="hover:text-[#C87941] hover:underline text-left block w-full">Missing Item</button></li>
              <li><button onClick={() => setTicketForm({...ticketForm, category: 'Order Issues'})} className="hover:text-[#C87941] hover:underline text-left block w-full">Wrong Order</button></li>
            </ul>
          </div>

          {/* Card 2: Payments */}
          <div className="support-card group">
            <div className="support-icon bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg mb-3 text-[#2C221E]">Payments</h3>
            <ul className="space-y-2 text-sm text-[#6B5E55]">
              <li><button onClick={() => setTicketForm({...ticketForm, category: 'Payments'})} className="hover:text-emerald-700 hover:underline text-left block w-full">Payment Failed</button></li>
              <li><button onClick={() => setTicketForm({...ticketForm, category: 'Payments'})} className="hover:text-emerald-700 hover:underline text-left block w-full">Refund Request</button></li>
              <li><button onClick={() => setTicketForm({...ticketForm, category: 'Payments'})} className="hover:text-emerald-700 hover:underline text-left block w-full">Coupon Issues</button></li>
              <li><button onClick={() => setTicketForm({...ticketForm, category: 'Payments'})} className="hover:text-emerald-700 hover:underline text-left block w-full">Billing Questions</button></li>
            </ul>
          </div>

          {/* Card 3: Reservations */}
          <div className="support-card group">
            <div className="support-icon bg-orange-50 text-orange-700 group-hover:bg-orange-600 group-hover:text-white transition-colors">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg mb-3 text-[#2C221E]">Reservations</h3>
            <ul className="space-y-2 text-sm text-[#6B5E55]">
              <li><button onClick={() => setTicketForm({...ticketForm, category: 'Reservations'})} className="hover:text-orange-700 hover:underline text-left block w-full">Modify Booking</button></li>
              <li><button onClick={() => setTicketForm({...ticketForm, category: 'Reservations'})} className="hover:text-orange-700 hover:underline text-left block w-full">Cancel Reservation</button></li>
              <li><button onClick={() => setTicketForm({...ticketForm, category: 'Reservations'})} className="hover:text-orange-700 hover:underline text-left block w-full">Table Availability</button></li>
              <li><button onClick={() => setTicketForm({...ticketForm, category: 'Reservations'})} className="hover:text-orange-700 hover:underline text-left block w-full">Booking Problems</button></li>
            </ul>
          </div>

          {/* Card 4: Delivery */}
          <div className="support-card group">
            <div className="support-icon bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg mb-3 text-[#2C221E]">Delivery</h3>
            <ul className="space-y-2 text-sm text-[#6B5E55]">
              <li><button onClick={() => setTicketForm({...ticketForm, category: 'Delivery'})} className="hover:text-blue-700 hover:underline text-left block w-full">Order Delayed</button></li>
              <li><button onClick={() => setTicketForm({...ticketForm, category: 'Delivery'})} className="hover:text-blue-700 hover:underline text-left block w-full">Delivery Status</button></li>
              <li><button onClick={() => setTicketForm({...ticketForm, category: 'Delivery'})} className="hover:text-blue-700 hover:underline text-left block w-full">Address Change</button></li>
              <li><button onClick={() => setTicketForm({...ticketForm, category: 'Delivery'})} className="hover:text-blue-700 hover:underline text-left block w-full">Delivery Issue</button></li>
            </ul>
          </div>

        </section>

        {/* 📦 3. FAQ ACCORDION & 5. MY SUPPORT REQUESTS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* FAQ Accordion */}
          <section className="lg:col-span-2 space-y-6">
            <div className="flex items-center space-x-2">
              <HelpCircle className="w-6 h-6 text-[#C87941]" />
              <h2 className="text-2xl font-bold text-[#2C221E]">Frequently Asked Questions</h2>
            </div>
            <div className="space-y-3">
              {faqs
                .filter(faq => 
                  faq.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  faq.a.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((faq, idx) => (
                  <div key={idx} className="faq-item">
                    <button
                      onClick={() => toggleFaq(idx)}
                      className="faq-question"
                    >
                      <span>{faq.q}</span>
                      {openFaq === idx ? (
                        <ChevronUp className="w-5 h-5 text-[#8A7B70]" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-[#8A7B70]" />
                      )}
                    </button>
                    {openFaq === idx && (
                      <div className="faq-answer">
                        {faq.a}
                      </div>
                    )}
                  </div>
              ))}
            </div>
          </section>

          {/* 5. My Support Requests */}
          <section className="space-y-6">
            <div className="flex items-center space-x-2">
              <Clock className="w-6 h-6 text-[#C87941]" />
              <h2 className="text-2xl font-bold text-[#2C221E]">My Requests</h2>
            </div>

            <div className="space-y-4">
              {myTickets.map((ticket) => (
                <div key={ticket.id} className="bg-white p-5 rounded-2xl border border-[#EFECE6] shadow-sm space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-[#C87941]"></div>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-semibold text-[#8A7B70]">Ticket #{ticket.id}</span>
                      <h4 className="font-bold text-[#2C221E]">{ticket.category}</h4>
                    </div>
                    <span className={`status-badge ${ticket.statusClass}`}>
                      🟡 {ticket.status}
                    </span>
                  </div>
                  
                  <div className="bg-[#FDF6F0] border border-[#F5EAD9] rounded-xl p-3 text-xs text-[#594B43] space-y-1">
                    <p className="font-semibold text-[#8C4F20]">Last update:</p>
                    <p className="italic">"{ticket.lastUpdate}"</p>
                  </div>

                  <div className="text-[11px] text-[#9E9085] text-right">
                    {ticket.date}
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* 📝 4. SUBMIT A SUPPORT TICKET */}
        <section className="ticket-box max-w-3xl mx-auto shadow-sm">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-[#2C221E]">Submit a Support Ticket</h2>
            <p className="text-sm text-[#8A7B70] mt-1">Can't find what you're looking for? Send us a message and our team will jump on it.</p>
          </div>

          {submitSuccess && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center space-x-3 text-sm animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>Ticket submitted successfully! You can track its status under "My Requests".</span>
            </div>
          )}

          <form onSubmit={handleTicketSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-[#4A3B34] mb-2">Category</label>
                <select
                  value={ticketForm.category}
                  onChange={(e) => setTicketForm({...ticketForm, category: e.target.value})}
                  className="ticket-select"
                >
                  <option value="Order Issues">Order Issues</option>
                  <option value="Payments">Payments & Refunds</option>
                  <option value="Reservations">Reservations</option>
                  <option value="Delivery">Delivery</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Order ID */}
              <div>
                <label className="block text-sm font-semibold text-[#4A3B34] mb-2">Order ID <span className="text-[#9E9085] font-normal">(optional)</span></label>
                <input
                  type="text"
                  placeholder="e.g. #BRW-9842"
                  value={ticketForm.orderId}
                  onChange={(e) => setTicketForm({...ticketForm, orderId: e.target.value})}
                  className="ticket-input placeholder-[#9E9085]"
                />
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-semibold text-[#4A3B34] mb-2">Message</label>
              <textarea
                rows="4"
                required
                placeholder="Describe your issue in detail..."
                value={ticketForm.message}
                onChange={(e) => setTicketForm({...ticketForm, message: e.target.value})}
                className="ticket-textarea placeholder-[#9E9085] resize-none"
              ></textarea>
            </div>

            {/* Screenshot Upload */}
            <div>
              <label className="block text-sm font-semibold text-[#4A3B34] mb-2">Screenshot upload <span className="text-[#9E9085] font-normal">(optional)</span></label>
              <div className="border-2 border-dashed border-[#EFECE6] rounded-2xl p-6 text-center hover:bg-[#FAF6F0]/50 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setTicketForm({...ticketForm, screenshot: e.target.files[0]})}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-10 h-10 bg-[#FDF6F0] text-[#C87941] rounded-full flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium text-[#4A3B34]">
                    {ticketForm.screenshot ? ticketForm.screenshot.name : "Click to upload screenshot or drag & drop"}
                  </p>
                  <p className="text-xs text-[#9E9085]">PNG, JPG up to 10MB</p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="support-btn"
            >
              {isSubmitting ? (
                <span>Submitting ticket...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Ticket</span>
                </>
              )}
            </button>
          </form>
        </section>

        {/* 📍 6. CONTACT INFORMATION */}
        <section className="contact-section max-w-3xl mx-auto shadow-md">
          <h3 className="text-xl font-bold mb-6 text-center">Other Ways to Reach Us</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="contact-item">
              <div className="w-10 h-10 bg-[#3D2F2A] rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-sm">Email Support</h4>
              <p className="text-xs text-[#C4B9B0]">support@brewedapp.com</p>
            </div>

            <div className="contact-item">
              <div className="w-10 h-10 bg-[#3D2F2A] rounded-full flex items-center justify-center">
                <Phone className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-sm">Phone Hotline</h4>
              <p className="text-xs text-[#C4B9B0]">+1 (800) 555-BREW</p>
            </div>

            <div className="contact-item">
              <div className="w-10 h-10 bg-[#3D2F2A] rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-sm">Opening Hours</h4>
              <p className="text-xs text-[#C4B9B0]">Mon - Sun: 7:00 AM - 10:00 PM</p>
            </div>

          </div>
        </section>

      </main>
    </div>
  );
}
