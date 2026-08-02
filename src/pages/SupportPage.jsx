import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc
} from "firebase/firestore";
import {
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  MessageCircle,
  Clock,
  ShieldCheck,
  Truck,
  Gift,
  CreditCard,
} from "lucide-react";

export default function SupportPage({ setPage }) {

  const [search, setSearch] = useState("");
  const [openFaq, setOpenFaq] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [supportSettings, setSupportSettings] = useState(null);
  const [loading, setLoading] = useState(true);


  const categories = [
    {
      title: "Orders",
      icon: Truck,
      description: "Track orders, cancellations and issues"
    },
    {
      title: "Payments",
      icon: CreditCard,
      description: "Payments, refunds and coupons"
    },
    {
      title: "Rewards",
      icon: Gift,
      description: "Points and loyalty questions"
    },
    {
      title: "Account",
      icon: ShieldCheck,
      description: "Profile and account help"
    }
  ];


  const policies = [
    {
      title:"Refund Policy",
      text:"Refunds are processed after verification and may take time depending on the payment provider."
    },
    {
      title:"Delivery Policy",
      text:"Delivery availability depends on location and operating hours."
    },
    {
      title:"Loyalty Policy",
      text:"Points and rewards follow Brewed loyalty rules and expiry settings."
    }
  ];


  useEffect(()=>{

    const loadSupportData = async()=>{

      try{

        // FAQs

        const faqSnap = await getDocs(
          collection(db,"faqs")
        );


        const faqData = faqSnap.docs
        .map(doc=>({
          id:doc.id,
          ...doc.data()
        }))
        .filter(faq=>faq.active);


        setFaqs(faqData);



        // Settings

        const settingsRef = doc(
          db,
          "supportSettings",
          "main"
        );


        const settingsSnap =
          await getDoc(settingsRef);


        if(settingsSnap.exists()){

          setSupportSettings(
            settingsSnap.data()
          );

        }


      }
      catch(error){

        console.log(
          "Support loading error:",
          error
        );

      }
      finally{

        setLoading(false);

      }

    };


    loadSupportData();

  },[]);


  const filteredFaqs = faqs.filter((faq)=>
    faq.question.toLowerCase().includes(search.toLowerCase()) ||
    faq.answer.toLowerCase().includes(search.toLowerCase())
  );


  if(loading){

    return(
      <div
        style={{
          minHeight:"100vh",
          display:"flex",
          justifyContent:"center",
          alignItems:"center",
          background:"#FDFAF5"
        }}
      >

        Loading support...

      </div>
    )

  }


  return (
    <div
      style={{
        minHeight:"100vh",
        background:"#FDFAF5",
        color:"#2C221E",
        paddingBottom:"40px"
      }}
    >
      <style>{`
        /* ==========================
           BREWED SUPPORT PAGE
        ========================== */

        .support-heading {
          font-family: "Playfair Display", serif;
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 18px;
          color: #2C221E;
        }

        /* GRID */
        .support-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
        }

        /* CARDS */
        .support-card {
          background: #FFFFFF;
          border: 1px solid #E8DED2;
          border-radius: 22px;
          padding: 22px;
          transition: all .25s ease;
        }

        .support-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(44,34,30,0.08);
        }

        .support-card h3 {
          margin-top: 14px;
          font-size: 17px;
          font-weight: 700;
          color:#2C221E;
        }

        .support-card p {
          margin-top:8px;
          color:#6B5E55;
          font-size:14px;
          line-height:1.5;
        }

        /* FAQ */
        .faq-card {
          background:white;
          border:1px solid #E8DED2;
          border-radius:18px;
          margin-bottom:12px;
          overflow:hidden;
        }

        .faq-card button {
          width:100%;
          padding:18px;
          display:flex;
          justify-content:space-between;
          align-items:center;
          background:white;
          border:none;
          cursor:pointer;
          font-weight:600;
          color:#2C221E;
        }

        .faq-card button:hover {
          background:#FAF6F0;
        }

        .faq-card p {
          padding:0 18px 18px;
          color:#6B5E55;
          font-size:14px;
          line-height:1.6;
          animation:faqOpen .25s ease;
        }

        @keyframes faqOpen {
          from{
            opacity:0;
            transform:translateY(-5px);
          }
          to{
            opacity:1;
            transform:translateY(0);
          }
        }

        /* INPUT */
        input::placeholder {
          color:#9A8C82;
        }

        /* MOBILE */
        @media(max-width:900px){
          .support-grid{
            grid-template-columns:repeat(2,1fr);
          }
        }

        @media(max-width:600px){
          .support-grid{
            grid-template-columns:1fr;
          }

          h1{
            font-size:26px !important;
          }
        }
      `}</style>

      {/* HEADER */}
      <header
        style={{
          padding:"20px",
          display:"flex",
          alignItems:"center",
          gap:"15px"
        }}
      >

        <button onClick={()=>setPage("menu")}>
          <ArrowLeft />
        </button>


        <div>
          <h1
            style={{
              fontFamily:"Playfair Display",
              fontSize:"32px"
            }}
          >
            How can we help?
          </h1>

          <p style={{color:"#6B5E55"}}>
            Find answers or contact Brewed support.
          </p>
        </div>

      </header>


      {/* SEARCH */}
      <section style={{padding:"20px"}}>

        <div
          style={{
            background:"#fff",
            border:"1px solid #E8DED2",
            borderRadius:"16px",
            display:"flex",
            alignItems:"center",
            padding:"12px 16px"
          }}
        >

          <Search color="#C4956A"/>

          <input
            placeholder="Search FAQs..."
            value={search}
            onChange={(e)=>setSearch(e.target.value)}
            style={{
              border:"none",
              outline:"none",
              flex:1,
              marginLeft:"10px",
              background:"transparent"
            }}
          />

        </div>

      </section>



      {/* CATEGORIES */}
      <section style={{padding:"20px"}}>

        <h2 className="support-heading">
          Browse Help
        </h2>


        <div className="support-grid">

          {categories.map((item,index)=>{

            const Icon=item.icon;

            return(
              <div className="support-card" key={index}>

                <Icon size={28} color="#C4956A"/>

                <h3>{item.title}</h3>

                <p>{item.description}</p>

              </div>
            )

          })}

        </div>

      </section>



      {/* FAQ */}
      <section style={{padding:"20px"}}>

        <h2 className="support-heading">
          Frequently Asked Questions
        </h2>


        {filteredFaqs.map((faq,index)=>(

          <div
            className="faq-card"
            key={faq.id || index}
          >

            <button
              onClick={()=>
                setOpenFaq(
                  openFaq===index ? null:index
                )
              }
            >

              <span>{faq.question}</span>

              {
                openFaq===index
                ? <ChevronUp/>
                : <ChevronDown/>
              }

            </button>


            {
              openFaq===index &&
              <p>
                {faq.answer}
              </p>
            }

          </div>

        ))}


      </section>



      {/* CONTACT */}
      <section style={{padding:"20px"}}>

        <h2 className="support-heading">
          Contact Support
        </h2>


        <div className="support-grid">

          <div className="support-card">
            <Phone color="#C4956A"/>
            <h3>Call Us</h3>
            <p>
              {supportSettings?.phone || "Loading..."}
            </p>
          </div>


          <div className="support-card">
            <Mail color="#C4956A"/>
            <h3>Email</h3>
            <p>
              {supportSettings?.email || "Loading..."}
            </p>
          </div>


          <div className="support-card">
            <MessageCircle color="#C4956A"/>
            <h3>WhatsApp</h3>
            <p>
              {supportSettings?.whatsapp || "Loading..."}
            </p>
          </div>

        </div>

      </section>



      {/* HOURS */}
      <section style={{padding:"20px"}}>

        <div className="support-card">

          <Clock color="#C4956A"/>

          <h3>Business Hours</h3>

          <p>
            Monday:
            <br/>
            {supportSettings?.hours?.monday || "9 AM - 10 PM"}
          </p>

        </div>

      </section>



      {/* POLICIES */}
      <section style={{padding:"20px"}}>

        <h2 className="support-heading">
          Support Policies
        </h2>


        {policies.map((policy,index)=>(

          <div className="support-card" key={index}>

            <h3>{policy.title}</h3>

            <p>{policy.text}</p>

          </div>

        ))}

      </section>


    </div>
  );
}
