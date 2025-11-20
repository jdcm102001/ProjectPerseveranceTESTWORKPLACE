window.MAY_DATA = {
  "TURN": 5,
  "MONTH": "May",
  "MARKET_DEPTH": {
    "SUPPLY": {
      "PERUVIAN": {
        "LTA_FIXED_MT": 5,
        "MAX_OPTIONAL_SPOT_MT": 15,
        "TOTAL_MAX_AVAILABLE_MT": 20,
        "ORIGIN_PORT": "Callao",
        "SUPPLIER_PREMIUM_USD": 20,
        "IS_PRIMARY": true
      },
      "CHILEAN": {
        "MIN_AVAILABLE_MT": 20,
        "MAX_AVAILABLE_MT": 70,
        "ORIGIN_PORT": "Antofagasta",
        "SUPPLIER_PREMIUM_USD": 5,
        "IS_PRIMARY": false
      },
      "TOTAL_MARKET_DEPTH_MT": 90
    },
    "DEMAND": {
      "AMERICAS": {
        "DEMAND_MT": 85
      },
      "ASIA": {
        "DEMAND_MT": 100
      },
      "EUROPE": {
        "DEMAND_MT": 65
      },
      "TOTAL_DEMAND_MT": 250
    }
  },
  "PRICING": {
    "LME": {
      "SPOT_AVG": 9550,
      "FUTURES_1M": 9680,
      "FUTURES_3M": 9850,
      "FUTURES_12M": 10200,
      "CURVE_STRUCTURE": "Strong Contango"
    },
    "COMEX": {
      "SPOT_AVG": 10455,
      "FUTURES_1M": 10585,
      "FUTURES_3M": 10755,
      "FUTURES_12M": 11105,
      "CURVE_STRUCTURE": "Strong Contango"
    },
    "M_PLUS_1": {
      "LME_AVG": 9338,
      "COMEX_AVG": 10410,
      "DESCRIPTION": "M+1 (June) average prices - used for both supplier purchase and client sale pricing based on sailing date"
    }
  },
  "LOGISTICS": {
    "FREIGHT_RATES": {
      "CALLAO": {
        "SHANGHAI": {
          "PORT_NAME": "Shanghai",
          "COUNTRY": "China",
          "DISTANCE_NM": 9500,
          "TRAVEL_TIME_DAYS": 28.3,
          "CIF_RATE_USD_PER_TONNE": 66,
          "FOB_RATE_USD_PER_TONNE": 75
        },
        "BUSAN": {
          "PORT_NAME": "Busan",
          "COUNTRY": "South Korea",
          "DISTANCE_NM": 9700,
          "TRAVEL_TIME_DAYS": 28.9,
          "CIF_RATE_USD_PER_TONNE": 68,
          "FOB_RATE_USD_PER_TONNE": 75
        },
        "NINGBO": {
          "PORT_NAME": "Ningbo",
          "COUNTRY": "China",
          "DISTANCE_NM": 9450,
          "TRAVEL_TIME_DAYS": 28.1,
          "CIF_RATE_USD_PER_TONNE": 65,
          "FOB_RATE_USD_PER_TONNE": 75
        },
        "SINGAPORE": {
          "PORT_NAME": "Singapore",
          "COUNTRY": "Singapore",
          "DISTANCE_NM": 10200,
          "TRAVEL_TIME_DAYS": 30.4,
          "CIF_RATE_USD_PER_TONNE": 73,
          "FOB_RATE_USD_PER_TONNE": 75
        },
        "ROTTERDAM": {
          "PORT_NAME": "Rotterdam",
          "COUNTRY": "Netherlands",
          "DISTANCE_NM": 6800,
          "TRAVEL_TIME_DAYS": 20.2,
          "CIF_RATE_USD_PER_TONNE": 85,
          "FOB_RATE_USD_PER_TONNE": 102
        },
        "VALENCIA": {
          "PORT_NAME": "Valencia",
          "COUNTRY": "Spain",
          "DISTANCE_NM": 6300,
          "TRAVEL_TIME_DAYS": 18.8,
          "CIF_RATE_USD_PER_TONNE": 81,
          "FOB_RATE_USD_PER_TONNE": 102
        },
        "HAMBURG": {
          "PORT_NAME": "Hamburg",
          "COUNTRY": "Germany",
          "DISTANCE_NM": 7100,
          "TRAVEL_TIME_DAYS": 21.1,
          "CIF_RATE_USD_PER_TONNE": 87,
          "FOB_RATE_USD_PER_TONNE": 102
        },
        "ANTWERP": {
          "PORT_NAME": "Antwerp",
          "COUNTRY": "Belgium",
          "DISTANCE_NM": 6900,
          "TRAVEL_TIME_DAYS": 20.5,
          "CIF_RATE_USD_PER_TONNE": 86,
          "FOB_RATE_USD_PER_TONNE": 102
        },
        "NEW_ORLEANS": {
          "PORT_NAME": "New Orleans",
          "COUNTRY": "USA",
          "DISTANCE_NM": 3100,
          "TRAVEL_TIME_DAYS": 9.2,
          "CIF_RATE_USD_PER_TONNE": 98,
          "FOB_RATE_USD_PER_TONNE": 132
        },
        "HOUSTON": {
          "PORT_NAME": "Houston",
          "COUNTRY": "USA",
          "DISTANCE_NM": 3200,
          "TRAVEL_TIME_DAYS": 9.5,
          "CIF_RATE_USD_PER_TONNE": 101,
          "FOB_RATE_USD_PER_TONNE": 132
        },
        "NEWARK": {
          "PORT_NAME": "Newark",
          "COUNTRY": "USA",
          "DISTANCE_NM": 4100,
          "TRAVEL_TIME_DAYS": 12.2,
          "CIF_RATE_USD_PER_TONNE": 108,
          "FOB_RATE_USD_PER_TONNE": 132
        },
        "MONTREAL": {
          "PORT_NAME": "Montreal",
          "COUNTRY": "Canada",
          "DISTANCE_NM": 5200,
          "TRAVEL_TIME_DAYS": 15.5,
          "CIF_RATE_USD_PER_TONNE": 118,
          "FOB_RATE_USD_PER_TONNE": 132
        }
      },
      "ANTOFAGASTA": {
        "SHANGHAI": {
          "PORT_NAME": "Shanghai",
          "COUNTRY": "China",
          "DISTANCE_NM": 10500,
          "TRAVEL_TIME_DAYS": 31.3,
          "CIF_RATE_USD_PER_TONNE": 68,
          "FOB_RATE_USD_PER_TONNE": 75
        },
        "BUSAN": {
          "PORT_NAME": "Busan",
          "COUNTRY": "South Korea",
          "DISTANCE_NM": 10700,
          "TRAVEL_TIME_DAYS": 31.8,
          "CIF_RATE_USD_PER_TONNE": 70,
          "FOB_RATE_USD_PER_TONNE": 75
        },
        "NINGBO": {
          "PORT_NAME": "Ningbo",
          "COUNTRY": "China",
          "DISTANCE_NM": 10450,
          "TRAVEL_TIME_DAYS": 31.1,
          "CIF_RATE_USD_PER_TONNE": 67,
          "FOB_RATE_USD_PER_TONNE": 75
        },
        "SINGAPORE": {
          "PORT_NAME": "Singapore",
          "COUNTRY": "Singapore",
          "DISTANCE_NM": 11200,
          "TRAVEL_TIME_DAYS": 33.3,
          "CIF_RATE_USD_PER_TONNE": 75,
          "FOB_RATE_USD_PER_TONNE": 75
        },
        "ROTTERDAM": {
          "PORT_NAME": "Rotterdam",
          "COUNTRY": "Netherlands",
          "DISTANCE_NM": 7800,
          "TRAVEL_TIME_DAYS": 23.2,
          "CIF_RATE_USD_PER_TONNE": 89,
          "FOB_RATE_USD_PER_TONNE": 102
        },
        "VALENCIA": {
          "PORT_NAME": "Valencia",
          "COUNTRY": "Spain",
          "DISTANCE_NM": 7300,
          "TRAVEL_TIME_DAYS": 21.7,
          "CIF_RATE_USD_PER_TONNE": 85,
          "FOB_RATE_USD_PER_TONNE": 102
        },
        "HAMBURG": {
          "PORT_NAME": "Hamburg",
          "COUNTRY": "Germany",
          "DISTANCE_NM": 8100,
          "TRAVEL_TIME_DAYS": 24.1,
          "CIF_RATE_USD_PER_TONNE": 91,
          "FOB_RATE_USD_PER_TONNE": 102
        },
        "ANTWERP": {
          "PORT_NAME": "Antwerp",
          "COUNTRY": "Belgium",
          "DISTANCE_NM": 7900,
          "TRAVEL_TIME_DAYS": 23.5,
          "CIF_RATE_USD_PER_TONNE": 90,
          "FOB_RATE_USD_PER_TONNE": 102
        },
        "NEW_ORLEANS": {
          "PORT_NAME": "New Orleans",
          "COUNTRY": "USA",
          "DISTANCE_NM": 4100,
          "TRAVEL_TIME_DAYS": 12.2,
          "CIF_RATE_USD_PER_TONNE": 108,
          "FOB_RATE_USD_PER_TONNE": 132
        },
        "HOUSTON": {
          "PORT_NAME": "Houston",
          "COUNTRY": "USA",
          "DISTANCE_NM": 4200,
          "TRAVEL_TIME_DAYS": 12.5,
          "CIF_RATE_USD_PER_TONNE": 111,
          "FOB_RATE_USD_PER_TONNE": 132
        },
        "NEWARK": {
          "PORT_NAME": "Newark",
          "COUNTRY": "USA",
          "DISTANCE_NM": 5100,
          "TRAVEL_TIME_DAYS": 15.2,
          "CIF_RATE_USD_PER_TONNE": 118,
          "FOB_RATE_USD_PER_TONNE": 132
        },
        "MONTREAL": {
          "PORT_NAME": "Montreal",
          "COUNTRY": "Canada",
          "DISTANCE_NM": 6200,
          "TRAVEL_TIME_DAYS": 18.5,
          "CIF_RATE_USD_PER_TONNE": 128,
          "FOB_RATE_USD_PER_TONNE": 132
        }
      }
    }
  },
  "FIXED_RULES": {
    "COST_OF_CARRY": {
      "MONTHLY_RATE": 0.0046,
      "SOFR_1M_PERCENT": 4.35,
      "FINANCING_PERIOD_MONTHS": 2,
      "DESCRIPTION": "Financing cost for capital tied up between purchase and sale settlement. Both supplier purchase and client sale are priced at M+1 (month following sailing date)."
    },
    "SUPPLIER_RULES": [
      {
        "SUPPLIER_TYPE": "Peruvian (LTA)",
        "RELATIONSHIP": "Mandatory LTA",
        "PURCHASE_BASIS": "LME M+1",
        "TONNAGE_RANGE": "5 MT Fixed",
        "SUPPLIER_PREMIUM_USD": 10,
        "ORIGIN_PORT": "Callao (Peru)"
      },
      {
        "SUPPLIER_TYPE": "Peruvian (Spot)",
        "RELATIONSHIP": "Optional Spot",
        "PURCHASE_BASIS": "LME M+1 or COMEX M+1",
        "TONNAGE_RANGE": "5–15 MT",
        "SUPPLIER_PREMIUM_USD": 15,
        "ORIGIN_PORT": "Callao (Peru)"
      },
      {
        "SUPPLIER_TYPE": "Chilean (Spot)",
        "RELATIONSHIP": "Optional Spot",
        "PURCHASE_BASIS": "LME M+1 or COMEX M+1",
        "TONNAGE_RANGE": "20–100 MT",
        "SUPPLIER_PREMIUM_USD": 0,
        "ORIGIN_PORT": "Antofagasta (Chile)"
      },
      {
        "SUPPLIER_TYPE": "Flash Sale",
        "RELATIONSHIP": "Narrative Event",
        "PURCHASE_BASIS": "LME/COMEX Spot (M)",
        "TONNAGE_RANGE": "5–25 MT",
        "SUPPLIER_PREMIUM_USD": 0,
        "ORIGIN_PORT": "N/A"
      }
    ]
  },
  "CLIENTS": {
    "OPPORTUNITIES": [
      {
        "REGION": "AMERICAS",
        "MIN_QUANTITY_MT": 40,
        "MAX_QUANTITY_MT": 85,
        "PORT_OF_DISCHARGE": "Houston, USA",
        "REFERENCE_EXCHANGE": "COMEX",
        "PORT_TYPE": "Parity",
        "REGIONAL_PREMIUM_USD": 55,
        "IS_PRIMARY": false
      },
      {
        "REGION": "ASIA",
        "MIN_QUANTITY_MT": 50,
        "MAX_QUANTITY_MT": 100,
        "PORT_OF_DISCHARGE": "Shanghai, China",
        "REFERENCE_EXCHANGE": "LME",
        "PORT_TYPE": "Hub",
        "REGIONAL_PREMIUM_USD": 140,
        "IS_PRIMARY": true
      },
      {
        "REGION": "EUROPE",
        "MIN_QUANTITY_MT": 20,
        "MAX_QUANTITY_MT": 65,
        "PORT_OF_DISCHARGE": "Rotterdam, Netherlands",
        "REFERENCE_EXCHANGE": "LME",
        "PORT_TYPE": "Hub",
        "REGIONAL_PREMIUM_USD": 95,
        "IS_PRIMARY": false
      }
    ]
  }
};
