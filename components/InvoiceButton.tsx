import React from 'react';
import axios from 'axios';
import { Button } from '@radix-ui/themes';

const InvoiceButton = ({ invoice }: any) => {
  const handlePayment = async (e: any) => {
    e.preventDefault();
    const { data } = await axios.post(
      '/api/payment',
      {
        invoice: invoice,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    window.location.assign(data);
  };

  return (
    <Button
      size='3'
      className='transition-all hover:scale-105 active:scale-100'
      onClick={handlePayment}
    >
      Pay Invoice
    </Button>
  );
};

export default InvoiceButton;
