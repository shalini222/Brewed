import { useEffect, useState } from "react";
import { db } from "../firebase";

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";


export default function EmployeeManagement(){

const [employees,setEmployees]=useState([]);

const [search,setSearch]=useState("");

const [roleFilter,setRoleFilter]=useState("all");

const [editing,setEditing]=useState(null);


const [form,setForm]=useState({
 name:"",
 email:"",
 phone:"",
 employeeId:"",
 role:"barista"
});



useEffect(()=>{
 fetchEmployees();
},[]);



const fetchEmployees=async()=>{

const snap=await getDocs(
 collection(db,"employees")
);


setEmployees(
 snap.docs.map(d=>({
 id:d.id,
 ...d.data()
 }))
);

};



const saveEmployee=async()=>{


if(editing){

await updateDoc(
 doc(db,"employees",editing),
 {
 ...form
 }
);


}
else{


await addDoc(
 collection(db,"employees"),
 {
 ...form,
 status:"active",
 joinedDate:new Date(),
 createdAt:serverTimestamp()
 }
);


}


setForm({
name:"",
email:"",
phone:"",
employeeId:"",
role:"barista"
});


setEditing(null);

fetchEmployees();


};



const editEmployee=(emp)=>{

setEditing(emp.id);

setForm({
name:emp.name,
email:emp.email,
phone:emp.phone,
employeeId:emp.employeeId,
role:emp.role
});


};



const deactivate=async(id)=>{

await updateDoc(
doc(db,"employees",id),
{
status:"inactive"
}
);


fetchEmployees();

};



const filteredEmployees =
employees.filter(emp=>{


const matchesSearch =
emp.name
?.toLowerCase()
.includes(search.toLowerCase());


const matchesRole =
roleFilter==="all"
||
emp.role===roleFilter;


return matchesSearch && matchesRole;


});




return (

<div>


<h1>
👨‍💼 Employee Management
</h1>



<input
placeholder="Search employee..."
value={search}
onChange={(e)=>setSearch(e.target.value)}
/>



<select
value={roleFilter}
onChange={(e)=>setRoleFilter(e.target.value)}
>

<option value="all">
All Roles
</option>

<option value="admin">
Admin
</option>

<option value="barista">
Barista
</option>

<option value="rider">
Rider
</option>

<option value="support">
Support
</option>


</select>




<h2>
{editing ? "Edit Employee":"Add Employee"}
</h2>


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

<option value="admin">
Admin
</option>

<option value="barista">
Barista
</option>

<option value="rider">
Rider
</option>

<option value="support">
Support
</option>

</select>



<button onClick={saveEmployee}>
{
editing 
?
"Update Employee"
:
"Add Employee"
}
</button>




<hr/>

<h2>
Employee List
</h2>


<div>


{
filteredEmployees.map(emp=>(


<div 
key={emp.id}
style={{
border:"1px solid #ddd",
padding:"15px",
margin:"10px"
}}
>


<h3>
{emp.name}
</h3>


<p>
ID: {emp.employeeId}
</p>


<p>
Role: {emp.role}
</p>


<p>
Status: {emp.status}
</p>



<button
onClick={()=>editEmployee(emp)}
>
Edit
</button>


<button
onClick={()=>deactivate(emp.id)}
>
Deactivate
</button>


</div>


))
}


</div>


</div>

);


}
