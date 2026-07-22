import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "../firebase";

export default function MenuManagement({
  setPage,
  setActivePage,
}) {
  /* ===========================================
     STATE
  =========================================== */

  const [menu, setMenu] = useState([]);

  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] =
  useState("featured");
  const [search, setSearch] =
    useState("");

  const [categoryFilter,
    setCategoryFilter] =
    useState("All");

  const [showAdd,
    setShowAdd] =
    useState(false);

  /* ===========================================
     LOAD MENU
  =========================================== */

  async function loadMenu() {
    try {
      const snapshot = await getDocs(
        collection(db, "menu")
      );

      const items = snapshot.docs.map(
        (doc) => ({
          firestoreId: doc.id,
          ...doc.data(),
        })
      );

      setMenu(items);

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }
  }

  /* ===========================================
     LOAD ON START
  =========================================== */

  useEffect(() => {
    loadMenu();
  }, []);




const filteredMenu = [...menu]

  .filter((item) => {

    const matchesSearch =
      item.name
        ?.toLowerCase()
        .includes(search.toLowerCase());

    const matchesCategory =
      categoryFilter === "All" ||
      item.category === categoryFilter;

    return (
      matchesSearch &&
      matchesCategory
    );

  })

  .sort((a, b) => {

    switch (sortBy) {

      case "priceLow":
        return a.price - b.price;

      case "priceHigh":
        return b.price - a.price;

      case "featured":
        return (
          Number(b.isFeatured) -
          Number(a.isFeatured)
        );

      case "sales":
        return (
          (b.salesCount || 0) -
          (a.salesCount || 0)
        );

      default:
        return a.name.localeCompare(b.name);

    }

  });




  

  /* ===========================================
     LOADING
  =========================================== */

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#FDFAF5",
          fontFamily: "Inter",
          fontSize: 18,
        }}
      >
        Loading Menu...
      </div>
    );
  }

  /* ===========================================
     PAGE
  =========================================== */

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FDFAF5",
        padding: "100px 30px",
      }}
    >

      {/* ===========================================
          HEADER
      =========================================== */}

      <button
        onClick={() =>
          setActivePage("dashboard")
        }
      >
        ← Dashboard
      </button>

      <h1
        style={{
          marginTop: 20,
          marginBottom: 35,
          fontFamily:
            "Playfair Display",
        }}
      >
        🍽 Menu Management
      </h1>

      {/* ===========================================
          TOP BAR
      =========================================== */}

      <div
        style={{
          display: "flex",
          gap: 15,
          flexWrap: "wrap",
          justifyContent:
            "space-between",
          alignItems: "center",
          marginBottom: 30,
        }}
      >

        <div
          style={{
            display: "flex",
            gap: 15,
            flexWrap: "wrap",
          }}
        >

          {/* Search */}

          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border:
                "1px solid #ddd",
              width: 260,
            }}
          />

          {/* Category */}

          <select
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(
                e.target.value
              )
            }
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border:
                "1px solid #ddd",
            }}
          >
            <option>All</option>
            <option>Coffee</option>
            <option>Tea</option>
            <option>Cold Drinks</option>
            <option>Desserts</option>
            <option>Food</option>
          </select>

        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >

          <strong>
            {menu.length} Products
          </strong>

          <button
            onClick={() =>
              setShowAdd(true)
            }
            style={{
              background:
                "#C4956A",
              color: "#fff",
              border: "none",
              padding:
                "12px 20px",
              borderRadius: 12,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            + Add Product
          </button>

        </div>

      </div>

      {/* ===========================================
          PRODUCT GRID
      =========================================== */}

      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: 30,
          minHeight: 400,
          boxShadow:
            "0 10px 25px rgba(0,0,0,.08)",
        }}
      >

        <h3
          style={{
            fontFamily:
              "Playfair Display",
            marginBottom: 20,
          }}
        >
          Products
        </h3>
      </div>



      {/* Search + Filters */}

<div
  style={{
    display: "flex",
    gap: 15,
    flexWrap: "wrap",
    marginBottom: 30,
    alignItems: "center",
  }}
>

  {/* Search */}

  <input
    type="text"
    placeholder="Search products..."
    value={search}
    onChange={(e) =>
      setSearch(e.target.value)
    }
    style={{
      flex: 1,
      minWidth: 260,
      padding: "14px 18px",
      borderRadius: 14,
      border: "1px solid #ddd",
      background: "#fff",
      fontSize: 15,
      outline: "none",
    }}
  />

  {/* Category */}

  <select
    value={categoryFilter}
    onChange={(e) =>
      setCategoryFilter(e.target.value)
    }
    style={{
      padding: "14px 18px",
      borderRadius: 14,
      border: "1px solid #ddd",
      background: "#fff",
      minWidth: 170,
    }}
  >
    <option>All</option>
    <option>Coffee</option>
    <option>Tea</option>
    <option>Cold Drinks</option>
    <option>Desserts</option>
    <option>Food</option>
  </select>

  {/* Sort */}

  <select
    value={sortBy}
    onChange={(e) =>
      setSortBy(e.target.value)
    }
    style={{
      padding: "14px 18px",
      borderRadius: 14,
      border: "1px solid #ddd",
      background: "#fff",
      minWidth: 170,
    }}
  >
    <option value="name">
      Name A-Z
    </option>

    <option value="priceLow">
      Price Low → High
    </option>

    <option value="priceHigh">
      Price High → Low
    </option>

    <option value="featured">
      Featured First
    </option>

    <option value="sales">
      Best Selling
    </option>
  </select>

</div>


      <div
  style={{
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fill,minmax(320px,1fr))",
    gap: 24,
  }}
>

  {filteredMenu.length === 0 && (

    <div
      style={{
        gridColumn: "1/-1",
        background: "#fff",
        borderRadius: 20,
        padding: 60,
        textAlign: "center",
        color: "#888",
      }}
    >
      No products found.
    </div>

  )}

  {filteredMenu.map((item) => (

    <div
      key={item.firestoreId}
      style={{
        background: "#fff",
        borderRadius: 24,
        overflow: "hidden",
        boxShadow:
          "0 12px 35px rgba(0,0,0,.08)",
        display: "flex",
        flexDirection: "column",
      }}
    >

      {/* Image */}

      <div
        style={{
          height: 220,
          background: "#F5F1EC",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >

        {item.img ? (

          <img
            src={item.img}
            alt={item.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />

        ) : (

          <div
            style={{
              fontSize: 70,
            }}
          >
            {item.emoji || "☕"}
          </div>

        )}

      </div>

      {/* Content */}

      <div
        style={{
          padding: 22,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
          }}
        >

          <h3
            style={{
              margin: 0,
              fontFamily:
                "Playfair Display",
            }}
          >
            {item.name}
          </h3>

          <strong
            style={{
              color: "#C4956A",
              fontSize: 20,
            }}
          >
            ₹{item.price}
          </strong>

        </div>

        <div
          style={{
            color: "#777",
            fontSize: 14,
          }}
        >
          {item.category}
        </div>

        <p
          style={{
            color: "#666",
            fontSize: 14,
            lineHeight: 1.6,
            minHeight: 45,
          }}
        >
          {item.desc}
        </p>

        {/* Badges */}

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >

          {item.isFeatured && (

            <span
              style={{
                background: "#FFF6DD",
                color: "#A66B00",
                padding:
                  "6px 12px",
                borderRadius: 30,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              ⭐ Featured
            </span>

          )}

          {item.available ? (

            <span
              style={{
                background: "#E8F8EC",
                color: "#2E7D32",
                padding:
                  "6px 12px",
                borderRadius: 30,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Available
            </span>

          ) : (

            <span
              style={{
                background: "#FDECEC",
                color: "#C62828",
                padding:
                  "6px 12px",
                borderRadius: 30,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Out of Stock
            </span>

          )}

        </div>

        {/* Stats */}

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            fontSize: 14,
            color: "#666",
            marginTop: 5,
          }}
        >
          <span>
            ⭐ {item.rating || 0}
          </span>

          <span>
            🛒 {item.salesCount || 0}
          </span>

          <span>
            💬 {item.reviews || 0}
          </span>
        </div>

        {/* Buttons */}

        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 18,
          }}
        >

          <button
            onClick={() => {

              setEditing(item);

              setEditItem(item);

            }}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 12,
              border: "none",
              background: "#C4956A",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Edit
          </button>

          <button
            onClick={() =>
              toggleAvailability(item)
            }
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 12,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            {item.available
              ? "Disable"
              : "Enable"}
          </button>

          <button
            onClick={() =>
              deleteProduct(
                item.firestoreId
              )
            }
            style={{
              padding: "12px 18px",
              border: "none",
              borderRadius: 12,
              background: "#E53935",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Delete
          </button>

        </div>

      </div>

    </div>

  ))}

</div>



      {/* ===========================
    ADD PRODUCT MODAL
=========================== */}

{showAdd && (

<div
  style={{
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.45)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
    zIndex: 999,
    overflowY: "auto",
  }}
>

<div
  style={{
    width: "100%",
    maxWidth: 900,
    background: "#fff",
    borderRadius: 28,
    padding: 35,
    maxHeight: "90vh",
    overflowY: "auto",
  }}
>

<h2
  style={{
    marginBottom: 30,
    fontFamily: "Playfair Display",
  }}
>
  Add New Product
</h2>

<div
  style={{
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(260px,1fr))",
    gap: 18,
  }}
>

<input
  placeholder="Product Name"
  value={newItem.name}
  onChange={(e)=>
    setNewItem({
      ...newItem,
      name:e.target.value,
    })
  }
/>

<input
  placeholder="Price"
  type="number"
  value={newItem.price}
  onChange={(e)=>
    setNewItem({
      ...newItem,
      price:e.target.value,
    })
  }
/>

<select
value={newItem.category}
onChange={(e)=>
setNewItem({
...newItem,
category:e.target.value,
})
}
>

<option>Coffee</option>
<option>Tea</option>
<option>Cold Drinks</option>
<option>Desserts</option>
<option>Food</option>

</select>

<input
placeholder="Emoji"
value={newItem.emoji}
onChange={(e)=>
setNewItem({
...newItem,
emoji:e.target.value,
})
}
/>

<input
placeholder="Image URL"
value={newItem.img}
onChange={(e)=>
setNewItem({
...newItem,
img:e.target.value,
})
}
/>

<input
placeholder="Preparation Time"
value={newItem.prepTime}
onChange={(e)=>
setNewItem({
...newItem,
prepTime:e.target.value,
})
}
/>

<select
value={newItem.servedAs}
onChange={(e)=>
setNewItem({
...newItem,
servedAs:e.target.value,
})
}
>

<option>Hot</option>
<option>Cold</option>
<option>Both</option>

</select>

<select
value={newItem.dietType}
onChange={(e)=>
setNewItem({
...newItem,
dietType:e.target.value,
})
}
>

<option>Vegetarian</option>
<option>Vegan</option>
<option>Egg</option>
<option>Non-Veg</option>

</select>

</div>

<textarea
placeholder="Description"

value={newItem.desc}

onChange={(e)=>
setNewItem({
...newItem,
desc:e.target.value,
})
}

rows={5}

style={{
marginTop:20,
width:"100%",
padding:15,
borderRadius:14,
border:"1px solid #ddd",
resize:"vertical",
}}
/>

<hr
  style={{
    margin: "30px 0",
    border: "none",
    borderTop: "1px solid #eee",
  }}
/>

<h3
  style={{
    marginBottom: 20,
    fontFamily: "Playfair Display",
  }}
>
  Product Options
</h3>

<div
  style={{
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(260px,1fr))",
    gap: 18,
  }}
>

<input
  placeholder="Sizes (Small,Medium,Large)"
  value={newItem.sizes.join(",")}
  onChange={(e)=>
    setNewItem({
      ...newItem,
      sizes:e.target.value
        .split(",")
        .map(s=>s.trim())
        .filter(Boolean),
    })
  }
/>

<input
  placeholder="Milk Options"
  value={newItem.milkOptions.join(",")}
  onChange={(e)=>
    setNewItem({
      ...newItem,
      milkOptions:e.target.value
        .split(",")
        .map(s=>s.trim())
        .filter(Boolean),
    })
  }
/>

<input
  placeholder="Temperature Options"
  value={newItem.temperatureOptions.join(",")}
  onChange={(e)=>
    setNewItem({
      ...newItem,
      temperatureOptions:e.target.value
        .split(",")
        .map(s=>s.trim())
        .filter(Boolean),
    })
  }
/>

<input
  placeholder="Sweetness (0%,25%,50%,75%,100%)"
  value={newItem.sweetnessOptions.join(",")}
  onChange={(e)=>
    setNewItem({
      ...newItem,
      sweetnessOptions:e.target.value
        .split(",")
        .map(s=>s.trim())
        .filter(Boolean),
    })
  }
/>

<input
  placeholder="Custom Extras"
  value={newItem.customExtras.join(",")}
  onChange={(e)=>
    setNewItem({
      ...newItem,
      customExtras:e.target.value
        .split(",")
        .map(s=>s.trim())
        .filter(Boolean),
    })
  }
/>

<input
  type="number"
  placeholder="Maximum Extras"
  value={newItem.customExtrasMaxSelection}
  onChange={(e)=>
    setNewItem({
      ...newItem,
      customExtrasMaxSelection:
        Number(e.target.value),
    })
  }
/>

</div>


  
<div
style={{
display:"flex",
gap:30,
marginTop:25,
flexWrap:"wrap",
}}
>

<label>

<input
type="checkbox"

checked={newItem.available}

onChange={(e)=>
setNewItem({
...newItem,
available:e.target.checked,
})
}
/>

{" "}
Available

</label>

<label>

<input
type="checkbox"

checked={newItem.isFeatured}

onChange={(e)=>
setNewItem({
...newItem,
isFeatured:e.target.checked,
})
}
/>

{" "}
Featured

</label>

</div>

<div
style={{
display:"flex",
justifyContent:"flex-end",
gap:15,
marginTop:35,
}}
>

<button

onClick={()=>
setShowAdd(false)
}

style={{
padding:"14px 24px",
borderRadius:14,
border:"1px solid #ddd",
background:"#fff",
cursor:"pointer",
}}
>

Cancel

</button>

<button

onClick={addProduct}

style={{
padding:"14px 30px",
borderRadius:14,
border:"none",
background:"#C4956A",
color:"#fff",
cursor:"pointer",
fontWeight:600,
}}
>

Save Product

</button>

</div>

</div>

</div>

)}

    </div>
  );
}

