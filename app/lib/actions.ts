'use server';

import { z } from 'zod'
import { Invoice } from './definitions';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth'


export type State = {
    errors?: {
      customerId?: string[];
      amount?: string[];
      status?: string[];
    };
    message?: string | null;
  };

const FormShcema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: 'Please select a customer.'
    }),
    amount: z.coerce.number().gt(0, { message: 'Please enter an amount greater than $0.'}),
    status: z.enum(['pending', 'paid'], {
        invalid_type_error: 'Please select an invoice status.'
    }),
    date: z.string()
});

const CreateInvoiceFormSchema = FormShcema.omit({
    id: true,
    date: true
})

const UpdateInvoice = FormShcema.omit({
    id: true,
    date: true
})

export async function createInvoice(prevState: State, form: FormData) {
    const validateField = CreateInvoiceFormSchema.safeParse({
        customerId: form.get('customerId'),
        amount: form.get('amount'),
        status: form.get('status')
    })
    
    if(!validateField.success) {
        return {
            errors: validateField.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Create Invoice.'
        }
    }

    const {customerId, amount, status} = validateField.data

    // Transformamos para evitar errores de redondeo
    const amountInCents = amount * 100
    // creamos la fecha actual año/mes/dia
    const [date] = new Date().toISOString().split('T')

    try {
        await sql`
            INSERT INTO invoices (customer_id, amount, status, date)
            VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
        `
    } catch (error) {
        return {
            message: "Database Error: Failed to create Invoice"
        }
    }

    revalidatePath('/dashboard/invoices')
    redirect('/dashboard/invoices')
}

export async function updateInvoice(id: string, prevState: State, form: FormData) {
    const validatedFields = UpdateInvoice.safeParse({
        customerId: form.get('customerId'),
        amount: form.get('amount'),
        status: form.get('status')
    })

    if(!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Update Invoice.',
          }
    }

    const {customerId, amount, status} = validatedFields.data

    const amountInCents = amount * 100

    try {
        await sql`
            UPDATE invoices
            SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
            WHERE id = ${id}
        `    
    } catch (error) {
        return {
            message: "Database Error: Failed to update Invoice"
        }
    }
    revalidatePath('/dashboard/invoices')
    redirect('/dashboard/invoices')
}

export async function deleteInvoice(id: string) {
    try {
        await sql`DELETE FROM invoices WHERE id = ${id}`
        revalidatePath('/dashboard/invoices')
    } catch (error) {
        return {
            message: "Database Error: Failed to delete Invoice"
        }
    }
}

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
  ) {
    try {
      await signIn('credentials', formData);
    } catch (error) {
      if (error instanceof AuthError) {
        switch (error.type) {
          case 'CredentialsSignin':
            return 'Invalid credentials.';
          default:
            return 'Something went wrong.';
        }
      }
      throw error;
    }
}