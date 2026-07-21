import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where
} from "firebase/firestore";


export default function AddressPage(){

const { currentUser } = useAuth();

const [addresses,setAddresses] = useState([]);
const [showForm,setShowForm] = useState(false);

const [form,setForm] = useState({
  name:"",
  phone:"",
  house:"",
  street:"",
  city:"",
  state:"",
  pincode:"",
  type:"Home",
  isDefault:false
});


return(
<div>

<h1>My Addresses</h1>

<button onClick={()=>setShowForm(true)}>
+ Add New Address
</button>


{addresses.map(address=>(
<div key={address.id}>

<h3>{address.type}</h3>

<p>{address.name}</p>
<p>{address.phone}</p>

<p>
{address.house}, {address.street}
</p>

<p>
{address.city}, {address.state} - {address.pincode}
</p>

<button>
Edit
</button>

<button>
Delete
</button>


</div>
))}



</div>
)

}
