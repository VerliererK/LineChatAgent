import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export const deleteUser = async (id: string) => {
  await sql`DELETE FROM users WHERE id = ${id}`;
};

export const getMessages = async (id: string) => {
  const result = await sql`SELECT messages FROM users WHERE id = ${id}`;
  if (result.length === 0) {
    return [] as { role: string; content: string; }[];
  }
  return result[0].messages || [] as { role: string; content: string; }[];
};

export const setMessages = async (id: string, messages: { role: string; content: string }[]) => {
  if (!Array.isArray(messages)) return;
  await sql`
    INSERT INTO users (id, messages)
    VALUES (${id}, ${JSON.stringify(messages)})
    ON CONFLICT (id) DO UPDATE SET
    messages = EXCLUDED.messages
  `;
};

export const clearMessages = async (id: string) => {
  await setMessages(id, []);
};
