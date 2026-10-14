import { Button } from '../components/button';

const entries = await loadEntries();

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold">Unmatched entries</h1>
      <p className="mt-2 text-muted-foreground">Match each bank line to a ledger entry before closing the month.</p>
      <table className="mt-8 w-full border-t border-border">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Description</th>
            <th scope="col">Amount</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td>{e.date}</td>
              <td>{e.description}</td>
              <td>{e.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button type="button">Match selected</Button>
    </main>
  );
}

async function loadEntries(): Promise<{ id: string, date: string, description: string, amount: string }[]> {
  return [];
}
