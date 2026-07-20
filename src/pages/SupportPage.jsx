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
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';

export default function SupportPage() {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // FAQ Accordion state
  const [openFaq, setOpenFaq] = useState(null);

  // Ticket Form state
  const [ticketForm, setTicketForm] = useState({
    category: 'Order Issues',
    orderId: '',
    message: '',
    screenshot: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Mock Active Requests (Simulating logged-in state)
  const [myTickets, setMyTickets] = useState([
    {
      id: '1024',
      category: 'Missing Item',
      status: 'In Progress',
      statusColor: 'bg-amber-100 text-amber-800 border-amber-300',
      lastUpdate: 'We are checking with the kitchen',
      date: 'Today, 2:45 PM'
    }
  ]);

  // FAQ Data
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
    
    // Simulate API call to Firebase Firestore
    setTimeout(() => {
      const newTicketId = Math.floor(1000 + Math.random() * 9000).toString();
      const newTicket = {
        id: newTicketId,
        category: ticketForm.category,
        status: 'In Progress',
        statusColor: 'bg-amber-100 text-amber-800 border-amber-300',
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
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans pb-16">
      
      {/* 📞 HEADER / HERO SECTION */}
      <section className="bg-gradient-to-b from-stone-900 to-amber-950 text-stone-100 py-16 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="max-w-3xl mx-auto relative z-10">
          <span className="inline-block px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-semibold tracking-wider uppercase mb-3 border border-amber-500/30">
            Brewed Support
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
            How can we help? ☕
          </h1>
          
          {/* Search FAQ Bar */}
          <div className="relative max-w-xl mx-auto">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-stone-400">
              <Search className="w-5 h-5" />
            </span>
            <input
              type="text"
              placeholder="Search for answers (e.g. refund, missing item, delivery)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-stone-800/90 border border-stone-700 rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-100 placeholder-stone-400 text-sm md:text-base backdrop-blur-sm transition-all"
            />
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 -mt-6 space-y-12 relative z-20">

        {/* ☕ 2. QUICK ACTIONS (4 CARDS) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: Order Issues */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200/80 hover:shadow-md transition-shadow group">
            <div className="w-12 h-12 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Coffee className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg mb-3 text-stone-800">Order Issues</h3>
            <ul className="space-y-2 text-sm text-stone-600">
              <li><button onClick={() => setTicketForm({...ticketForm, category: 'Order Issues'})} className="hover:text-amber-700 hover:underline text-left block w-full">Track Order</button></li>
              <li><button onClick={() => setTicketForm({...ticketForm, category: 'Order Issues'})} className="hover:text-amber-700 hover:underline text-left block w-full">Cancel Order</button></li>
              <li><button onClick={() => setTicketForm({...ticketForm, category: 'Order Issues'})} className="hover:text-amber-700 hover:underline text-left block w-full">Missing Item</button></li>
              <li><button onClick={() => setTicketForm({...ticketForm, category: 'Order Issues'})} className="hover:text-amber-700 hover:underline text-left block w-full">Wrong Order</button></li>
            </ul>
          </div>

          {/* Card 2: Payments */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200/80 hover:shadow-md transition-shadow group">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg mb-3 text-stone-800">Payments</h3>
            <ul className="space-y-2 text-sm text-stone-600">
              <li><button onClick={() => setTicketForm({...ticketForm, category: 'Payments'})} className="hover:text-emerald-700 hover:underline text-left block w-full">Payment Failed</button></li>
              <li><button onClick={() => setTicketForm({...ticketForm, category: 'Payments'})} className="hover:text-emerald-700 hover:underline text-left block w-full">Refund Request</button></li>
              <li><button onClick={() => setTicketForm({...ticketForm, category: 'Payments'})} className="hover:text-emerald-700 hover:underline text-left block w-full">Coupon Issues</button></li>
              <li><button onClick={() => setTicketForm({...ticketForm, category: 'Payments'})} className="hover:text-emerald-700 hover:underline text-left block w-full">Billing Questions</button></li>
            </ul>
          </div>

          {/* Card 3: Reservations */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200/80 hover:shadow-md transition-shadow group">
            <div className="w-12 h-12 bg-orange-50 text-orange-700 rounded-xl flex items-center justify-center mb-4 group-hover:bg-orange-600 group-hover:text-white transition-colors">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg mb-3 text-stone-800">Reservations</h3>
            <ul className="space-y-2 text-sm text-stone-600">
              <li><button onClick={() => setTicketForm({...ticketForm, category: 'Reservations'})} className="hover:text-orange-700 hover:underline text-left block w-full">Modify Booking</button></li>
              <li><button onClick={() => setTicketForm({...ticketForm, category: 'Reservations'})} className="hover:text-orange-700 hover:underline text-left block w-full">Cancel Reservation</button></li>
              <li><button onClick={() => setTicketForm({...ticketForm, category: 'Reservations'})} className="hover:text-orange-700 hover:underline text-left block w-full">Table Availability</button></li>
              <li><button onClick={() => setTicketForm({...ticketForm, category: 'Reservations'})} className="hover:text-orange-700 hover:underline text-left block w-full">Booking Problems</button></li>
            </ul>
          </div>

          {/* Card 4: Delivery */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200/80 hover:shadow-md transition-shadow group">
            <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg mb-3 text-stone-800">Delivery</h3>
            <ul className="space-y-2 text-sm text-stone-600">
              <li><button onClick={() => setTicketForm({...ticketForm, category: 'Delivery'})} className="hover:text-blue-700 hover:underline text-left block w-full">Order Delayed</button></li>
              <li><button onClick={() => setTicketForm({...ticketForm, category: 'Delivery'})} className="hover:text-blue-700 hover:underline text-left block w-full">Delivery Status</button></li>
              <li><button onClick={() => setTicketForm({...ticketForm, category: 'Delivery'})} className="hover:text-blue-700 hover:underline text-left block w-full">Address Change</button></li>
              <li><button onClick={() => setTicketForm({...ticketForm, category: 'Delivery'})} className="hover:text-blue-700 hover:underline text-left block w-full">Delivery Issue</button></li>
            </ul>
          </div>

        </section>

        {/* 📦 3. FAQ ACCORDION & 5. MY SUPPORT REQUESTS (Grid Layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* FAQ Accordion (Takes up 2 columns) */}
          <section className="lg:col-span-2 space-y-6">
            <div className="flex items-center space-x-2">
              <HelpCircle className="w-6 h-6 text-amber-700" />
              <h2 className="text-2xl font-bold text-stone-800">Frequently Asked Questions</h2>
            </div>
            <div className="space-y-3">
              {faqs
                .filter(faq => 
                  faq.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  faq.a.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((faq, idx) => (
                  <div 
                    key={idx} 
                    className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm transition-all"
                  >
                    <button
                      onClick={() => toggleFaq(idx)}
                      className="w-full px-6 py-4 text-left font-medium text-stone-800 flex justify-between items-center hover:bg-stone-50"
                    >
                      <span>{faq.q}</span>
                      {openFaq === idx ? (
                        <ChevronUp className="w-5 h-5 text-stone-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-stone-500" />
                      )}
                    </button>
                    {openFaq === idx && (
                      <div className="px-6 pb-4 pt-1 text-sm text-stone-600 border-t border-stone-100 bg-stone-50/50">
                        {faq.a}
                      </div>
                    )}
                  </div>
              ))}
            </div>
          </section>

          {/* 5. My Support Requests (Takes up 1 column) */}
          <section className="space-y-6">
            <div className="flex items-center space-x-2">
              <Clock className="w-6 h-6 text-amber-700" />
              <h2 className="text-2xl font-bold text-stone-800">My Requests</h2>
            </div>

            <div className="space-y-4">
              {myTickets.map((ticket) => (
                <div key={ticket.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-semibold text-stone-400">Ticket #{ticket.id}</span>
                      <h4 className="font-bold text-stone-800">{ticket.category}</h4>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${ticket.statusColor}`}>
                      🟡 {ticket.status}
                    </span>
                  </div>
                  
                  <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 text-xs text-stone-700 space-y-1">
                    <p className="font-semibold text-amber-900">Last update:</p>
                    <p className="italic">"{ticket.lastUpdate}"</p>
                  </div>

                  <div className="text-[11px] text-stone-400 text-right">
                    {ticket.date}
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* 📝 4. SUBMIT A SUPPORT TICKET */}
        <section className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-stone-800">Submit a Support Ticket</h2>
            <p className="text-sm text-stone-500 mt-1">Can't find what you're looking for? Send us a message and our team will jump on it.</p>
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
                <label className="block text-sm font-semibold text-stone-700 mb-2">Category</label>
                <select
                  value={ticketForm.category}
                  onChange={(e) => setTicketForm({...ticketForm, category: e.target.value})}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-800 text-sm"
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
                <label className="block text-sm font-semibold text-stone-700 mb-2">Order ID <span className="text-stone-400 font-normal">(optional)</span></label>
                <input
                  type="text"
                  placeholder="e.g. #BRW-9842"
                  value={ticketForm.orderId}
                  onChange={(e) => setTicketForm({...ticketForm, orderId: e.target.value})}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-800 text-sm placeholder-stone-400"
                />
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Message</label>
              <textarea
                rows="4"
                required
                placeholder="Describe your issue in detail..."
                value={ticketForm.message}
                onChange={(e) => setTicketForm({...ticketForm, message: e.target.value})}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-stone-800 text-sm placeholder-stone-400 resize-none"
              ></textarea>
            </div>

            {/* Screenshot Upload */}
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2">Screenshot upload <span className="text-stone-400 font-normal">(optional)</span></label>
              <div className="border-2 border-dashed border-stone-200 rounded-2xl p-6 text-center hover:bg-stone-50/50 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setTicketForm({...ticketForm, screenshot: e.target.files[0]})}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-10 h-10 bg-amber-50 text-amber-700 rounded-full flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium text-stone-700">
                    {ticketForm.screenshot ? ticketForm.screenshot.name : "Click to upload screenshot or drag & drop"}
                  </p>
                  <p className="text-xs text-stone-400">PNG, JPG up to 10MB</p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
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
        <section className="bg-stone-900 text-stone-100 rounded-3xl p-8 max-w-3xl mx-auto shadow-md">
          <h3 className="text-xl font-bold mb-6 text-center">Other Ways to Reach Us</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            
            <div className="flex flex-col items-center space-y-2">
              <div className="w-10 h-10 bg-stone-800 text-amber-500 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-sm">Email Support</h4>
              <p className="text-xs text-stone-400">support@brewedapp.com</p>
            </div>

            <div className="flex flex-col items-center space-y-2">
              <div className="w-10 h-10 bg-stone-800 text-amber-500 rounded-full flex items-center justify-center">
                <Phone className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-sm">Phone Hotline</h4>
              <p className="text-xs text-stone-400">+1 (800) 555-BREW</p>
            </div>

            <div className="flex flex-col items-center space-y-2">
              <div className="w-10 h-10 bg-stone-800 text-amber-500 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-sm">Opening Hours</h4>
              <p className="text-xs text-stone-400">Mon - Sun: 7:00 AM - 10:00 PM</p>
            </div>

          </div>
        </section>

      </main>
    </div>
  );
}
