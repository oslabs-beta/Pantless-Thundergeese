import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { getToken } from "sf-jwt-token";
import axios from "axios";
import { InvoiceProps, PaymentProps } from "./types";

const { SALESFORCE_CLIENT_ID, SALESFORCE_USERNAME, SALESFORCE_URL, BASE64_PRIVATE_KEY, SALESFORCE_GRAPHQL_URI, SALESFORCE_COOKIE_AUTH } = process.env;

/*
overview of API field names and what they reference
Opportunity_18_Digit_ID__c: 18 character unique ID
 npe01__Opportunity__c: references opportunity by name from the payment record
ID: unique reference id for the object
Invoice_Sent_Date__c: date sent
Invoice__c: Invoice number
Opportunity_Account_Name__c: account name of the opportunity (project) the payment is for
npe01__Payment_Amount__c: amount on invoice
npe01__Payment_Date__c: date invoice paid
npe01__Payment_Method__c: method of payment (cc, check, etc.)
*/

const data = JSON.stringify({
	query: `query payments {
  uiapi {
    query {
      npe01__OppPayment__c {
        edges {
          node {
            Id
            Invoice__c {
                value
            }
            Invoice_Sent_Date__c {
                value
            }
            npe01__Payment_Amount__c {
                value
            }
            Opportunity_Account_Name__c {
                value
            }
            Opportunity_18_Digit_ID__c {
                value
            }
            Project_Number__c {
              value
              }
            npe01__Payment_Method__c {
                value
            }
            npe01__Payment_Date__c {
                value
            }
            npe01__Scheduled_Date__c{
							value
						}
          }
        }
      }
    }
  }
}`,
	variables: {}
});

export const monthNames = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const updateSearchParams = (type: string, value: string) => {
  // Get the current URL search params
  const searchParams = new URLSearchParams(window.location.search);

  // Set the specified search parameter to the given value
  searchParams.set(type, value);

  // Set the specified search parameter to the given value
  const newPathname = `${window.location.pathname}?${searchParams.toString()}`;

  return newPathname;
};

export const getSalesForceAccessToken = async () => {
    // convert the base64 private key into a string
    const privateKey = Buffer.from(BASE64_PRIVATE_KEY, 'base64').toString('utf8');

    try {
      // gets a new (if it hasn't expired it will send the still active token) access token from sales force
      const jwtTokenResponse = await getToken({
        iss: SALESFORCE_CLIENT_ID as string,
        sub: SALESFORCE_USERNAME as string,
        aud: SALESFORCE_URL as string,
        privateKey: privateKey,
      });

      return jwtTokenResponse.access_token;
      }
     catch (error) {
      if (error instanceof Error) {
          console.error('Error fetching token:', error);
      }
	  throw Error;
    }
}

export const getSalesForceInvoiceData = async (accessToken: string) => {
	
	const res = await axios.request({
	  method: 'post',
	  maxBodyLength: Infinity,
	  url: SALESFORCE_GRAPHQL_URI,
	  headers: {
		'X-Chatter-Entity-Encoding': 'false',
		'Content-Type': 'application/json',
		'Authorization': `Bearer ${accessToken}`,
		'Cookie': SALESFORCE_COOKIE_AUTH,
	  },
	  data: data,
	});

	// retrieve all invoice information from salesforce graphql call
	const paymentInfo = res.data.data.uiapi.query.npe01__OppPayment__c.edges;
  
	const invoices: PaymentProps[] = [];

	paymentInfo.map((record: InvoiceProps) => {
		const { Id, Invoice__c, Invoice_Sent_Date__c, npe01__Payment_Amount__c, Opportunity_Account_Name__c, Project_Number__c, npe01__Payment_Method__c, npe01__Payment_Date__c, npe01__Scheduled_Date__c } = record.node

		const invoice: PaymentProps = {
			sf_unique_id: Id,
			invoice_id: Invoice__c.value,
			amount: npe01__Payment_Amount__c.value,
			invoice_sent_date: Invoice_Sent_Date__c.value,
			payment_date: npe01__Payment_Date__c.value,
			invoice_due_date: npe01__Scheduled_Date__c.value,
			payment_method: npe01__Payment_Method__c.value,
			project_name: Project_Number__c.value,
			account_name: Opportunity_Account_Name__c.value,
		}

		invoices.push(invoice);

	  })
	  return invoices
  }

   // helper function to get the month (ex. 'Jan') from the date we get from SF ('2023-10-19')
  export const getMonthNameFromDueDate = (due_date: string) => {
    const date = new Date(due_date);
    return monthNames[date.getMonth()];
  };


  export const formatSalesForceData = (data: PaymentProps[] ) => {
    // creates a map to hold every month's data
    const revenueByMonth: Map<string, number> = new Map();

    // loop through each month and set each month (ex 'Jan') on the Map and its revenue data to 0
    for (const month of monthNames) {
      revenueByMonth.set(month, 0);
    }

    // loop through the resulting data from the SF graphQL and add its data to the specific month
    data.forEach((invoice) => {
      const { payment_date, amount } = invoice;
      const currentYear = new Date().getFullYear().toString();

      if (payment_date && payment_date?.includes(currentYear)) {
        const month = getMonthNameFromDueDate(payment_date as string);
        const currentRevenue = revenueByMonth.get(month) || 0;
  
        revenueByMonth.set(month, currentRevenue + amount);
      }
    });

    // convert the map to an array
    const mappedData = Array.from(revenueByMonth, ([month, revenue]) => ({
      month,
      revenue,
    }));

    // set the invoice data with the mappedData
    return mappedData;
  };





export const getMonthlyRevenueData = (data: PaymentProps[] ) => {
  // initialize the revenue data for each month to zero
  const revenueByMonth = [
    { month: 'Jan', revenue: 0 },
    { month: 'Feb', revenue: 0 },
    { month: 'Mar', revenue: 0 },
    { month: 'Apr', revenue: 0 },
    { month: 'May', revenue: 0 },
    { month: 'Jun', revenue: 0 },
    { month: 'Jul', revenue: 0 },
    { month: 'Aug', revenue: 0 },
    { month: 'Sep', revenue: 0 },
    { month: 'Oct', revenue: 0 },
    { month: 'Nov', revenue: 0 },
    { month: 'Dec', revenue: 0 },
  ];
  // loop through the resulting data from salesforce and add the revenue data to the specific month
  data.forEach((invoice) => {
    const { payment_date, amount } = invoice;
    const currentYear = new Date().getFullYear().toString();

    if (payment_date && payment_date?.includes(currentYear)) {
      const date = new Date(payment_date);
      revenueByMonth[date.getMonth()].revenue += amount;
    }
  });

  return revenueByMonth;
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type ResultsProps = {
  revenueData: number | null,
  payments: PaymentProps[] | any[]
  yearRevenue: number,
  outstandingInvoices: number,
  monthRevenue: number,
  monthRevenueGrowth: number,
  yearRevenueGrowth: number,
  revenueDataByMonth: {
    month: string;
    revenue: number;
  }[] | undefined
}

export const getRevenueData = (data: PaymentProps[] | undefined) => {

  const results: ResultsProps  = {
    revenueData: null, 
    payments: [], 
    yearRevenue: 0, 
    outstandingInvoices: 0, 
    monthRevenue: 0, 
    monthRevenueGrowth: 0, 
    yearRevenueGrowth: 0,
    revenueDataByMonth: undefined
  }

  let pastMonthRevenue = 0;
  let pastYearRevenue = 0;
  const currentYear = new Date().getFullYear().toString();
  const pastYear = (new Date().getFullYear() - 1).toString();
  const currentMonth = (new Date().getMonth() + 1).toString();
  const pastMonth = new Date().getMonth().toString();
  const currentDate = new Date();

  if (data) {
    for (let i = 0; i < data.length && i < 5; i++) {
      if (data[i].payment_date && data[i].payment_date?.includes(currentYear)) {
        results.payments.push(data[i]);
      }
    }

    data.forEach((invoice) => {
      if (invoice.payment_date && invoice.payment_date.includes(currentYear)) {
        results.yearRevenue += invoice.amount;
      }
      if (invoice.payment_date && invoice.payment_date.includes(pastYear)) {
        pastYearRevenue += invoice.amount;
      }
      if (
        invoice.payment_date &&
        invoice.payment_date.slice(5, 7).includes(currentMonth)
      ) {
        results.monthRevenue += invoice.amount;
      }
      if (
        invoice.payment_date &&
        invoice.payment_date.slice(5, 7).includes(pastMonth)
      ) {
        pastMonthRevenue += invoice.amount;
      }
      if (
        invoice.invoice_due_date &&
        new Date(invoice.invoice_due_date) < currentDate &&
        invoice.payment_date === undefined
      ) {
        results.outstandingInvoices += 1;
      }
    });
    results.revenueDataByMonth = getMonthlyRevenueData(data);

    results.monthRevenueGrowth = getRevenueGrowth(pastMonthRevenue, results.monthRevenue);

    results.yearRevenueGrowth = getRevenueGrowth(pastYearRevenue, results.yearRevenue);

  }
  return (results)
} 

const getRevenueGrowth = (pastRevenue: number, currentRevenue: number) => {
  return pastRevenue !== 0
      ? (currentRevenue - pastRevenue) / pastRevenue * 100
      : currentRevenue === 0
      ? 0
      : 100;
}