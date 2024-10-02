import { createClient } from '@supabase/supabase-js';
import express from 'express';
const supabaseUrl = 'https://rujclvrxksqnijyqcwgz.supabase.co';
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1amNsdnJ4a3NxbmlqeXFjd2d6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzgyNjk3MCwiZXhwIjoyMDQzNDAyOTcwfQ.-MBORoWRddYlYuyIbFJKjFFJv2aN8AaHXfiDMsoPCKg";
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
app.use(express.json());

async function insertToSupabase(table, values) {
    const error = await supabase
        .from(table)
        .insert(values);
    return error;
}
app.get("/", async (req,res) =>{
    res.send("hola vercel");
})
app.post("/turnos", async (req, res) =>{
    const body = req.body;
    const fecha = body.fecha;
    const hora = body.hora;
    const idUsuario = body.idUsuario;
    const insert_error = insertToSupabase("turnos", {
        fecha: fecha,
        hora: hora,
        id_usuario: idUsuario 
    });
    if (error_insert) {
        return res.status(500).send('Error inserting data');
    }
} )
app.get("/turnos", async (req,res) =>{
    const { data, error } = await supabase
        .from('Estudios')
        .select('*');
    if (error) {
        console.error('Error fetching data:', error.message);
        return res.status(500).send('Error fetching data');
    }
    res.send(data);
})

app.listen(3000, () => {
    console.log("Server running on port 3000");
});