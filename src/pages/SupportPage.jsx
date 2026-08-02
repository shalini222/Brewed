import React, { useState } from "react";
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


  const faqs = [
    {
      question: "How long does delivery take?",
      answer:
        "Delivery usually takes 30-45 minutes depending on location and order volume.",
      category:"Delivery"
    },
    {
      question: "Can I cancel my order?",
      answer:
        "Orders can be cancelled before preparation begins.",
      category:"Orders"
    },
    {
      question: "How do loyalty points work?",
      answer:
        "You earn points on eligible purchases and can redeem them for rewards.",
      category:"Rewards"
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


  const filteredFaqs = faqs.filter((faq)=>
    faq.question.toLowerCase().includes(search.toLowerCase()) ||
    faq.answer.toLowerCase().includes(search.toLowerCase())
  );


  return (
    <div
      style={{
        minHeight:"100vh",
        background:"#FDFAF5",
        color:"#2C221E",
        paddingBottom:"40px"
      }}
    >

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
            key={index}
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
            <p>+91 XXXXX XXXXX</p>
          </div>


          <div className="support-card">
            <Mail color="#C4956A"/>
            <h3>Email</h3>
            <p>support@brewed.com</p>
          </div>


          <div className="support-card">
            <MessageCircle color="#C4956A"/>
            <h3>WhatsApp</h3>
            <p>Chat with us</p>
          </div>

        </div>

      </section>



      {/* HOURS */}
      <section style={{padding:"20px"}}>

        <div className="support-card">

          <Clock color="#C4956A"/>

          <h3>Business Hours</h3>

          <p>
            Monday - Sunday<br/>
            9 AM - 10 PM
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
