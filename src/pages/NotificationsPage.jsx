import React from "react";

import {
  Coffee,
    Gift,
      Star,
        Sparkles,
          Bell,
            ArrowLeft
            } from "lucide-react";

const notifications = [
      {
          id: 1,
              icon: <Coffee size={28} />,
                  title: "Order Ready",
                      message: "Your Cappuccino is ready for pickup.",
                          time: "2 min ago",
                              unread: true,
                                },

                                  {
                                      id: 2,
                                          icon: <Gift size={28} />,
                                              title: "Birthday Reward",
                                                  message: "Claim your FREE handcrafted coffee.",
                                                      time: "Today",
                                                          unread: true,
                                                            },

                                                              {
                                                                  id: 3,
                                                                      icon: <Star size={28} />,
                                                                          title: "Almost Silver",
                                                                              message: "Only 20 Beans until Silver Member.",
                                                                                  time: "Yesterday",
                                                                                      unread: false,
                                                                                        },

                                                                                          {
                                                                                              id: 4,
                                                                                                  icon: <Sparkles size={28} />,
                                                                                                      title: "Seasonal Collection",
                                                                                                          message: "Pumpkin Spice Latte has arrived.",
                                                                                                              time: "2 days ago",
                                                                                                                  unread: false,
                                                                                                                    },
                                                                                                                ]
