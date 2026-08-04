import { useEffect, useState } from "react";
import { db } from "../firebase";

import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";


export default function EmployeeManagement(){

  const [employees,setEmployees] = useState([]);

  const [form,setForm] = useState({
    name:"",
    email:"",
    phone:"",
    employeeId:"",
    role:"barista"
  });


  useEffect(()=>{
    fetchEmployees();
  },[]);


  const fetchEmployees = async()=>{

    const snap = await getDocs(
      collection(db,"employees")
    );

    const data = snap.docs.map(doc=>({
      id:doc.id,
      ...doc.data()
    }));

    setEmployees(data);
  };


  const addEmployee = async()=>{

    await addDoc(
      collection(db,"employees"),
      {
        ...form,
        status:"active",
        joinedDate:new Date(),
        createdAt:serverTimestamp()
      }
    );


    setForm({
      name:"",
      email:"",
      phone:"",
      employeeId:"",
      role:"barista"
    });


    fetchEmployees();
  };



  const deactivateEmployee = async(id)=>{

    await updateDoc(
      doc(db,"employees",id),
      {
        status:"inactive"
      }
    );


    fetchEmployees();

  };



return (

<div>

<h1>
👨‍💼 Employee Management
</h1>


<div>

<input
placeholder="Name"
value={form.name}
onChange={(e)=>
setForm({...form,name:e.target.value})
}
/>


<input
placeholder="Email"
value={form.email}
onChange={(e)=>
setForm({...form,email:e.target.value})
}
/>


<input
placeholder="Phone"
value={form.phone}
onChange={(e)=>
setForm({...form,phone:e.target.value})
}
/>


<input
placeholder="Employee ID"
value={form.employeeId}
onChange={(e)=>
setForm({...form,employeeId:e.target.value})
}
/>


<select

value={form.role}

onChange={(e)=>
setForm({...form,role:e.target.value})
}

>

<option value="barista">
Barista
</option>


<option value="rider">
Rider
</option>


<option value="support">
Support
</option>


<option value="admin">
Admin
</option>


</select>



<button onClick={addEmployee}>
Add Employee
</button>


</div>



<hr/>


<h2>
Employees
</h2>


{
employees.map(emp=>(

<div key={emp.id}>


<h3>
{emp.name}
</h3>


<p>
Role: {emp.role}
</p>


<p>
Status: {emp.status}
</p>


<button
onClick={()=>
deactivateEmployee(emp.id)
}
>
Deactivate
</button>


</div>

))

}


</div>

);


}
