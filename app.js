import { createClient } from '@supabase/supabase-js';
import express from 'express';
import jwt from 'jsonwebtoken';

const supabaseUrl = 'https://rujclvrxksqnijyqcwgz.supabase.co';
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1amNsdnJ4a3NxbmlqeXFjd2d6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzgyNjk3MCwiZXhwIjoyMDQzNDAyOTcwfQ.-MBORoWRddYlYuyIbFJKjFFJv2aN8AaHXfiDMsoPCKg";
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const port = 3000;
app.use(express.json());

function authenticateToken (req, res, next) {
    //Bearer token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let token_limpio = token.slice(1, -1);
 
    if (token_limpio === null) return res.sendStatus(401);
    jwt.verify(token_limpio, process.env.ACCESS_TOKEN_SECRET, (err,id) => {
        if (err) return res.status(403); //token expiration
        req.id = id;
        next();
    })
}
async function insertToSupabase(table, values) {
    const error = await supabase
        .from(table)
        .insert(values);
    return error;
}
app.get("/", async (req,res) =>{
    res.send("hola vercel");
})
app.post("/turnos",  async (req, res) =>{
    const body = req.body;
    const fecha = body.fecha;
    const hora = body.hora;
    const idUsuario = body.idUsuario;
    const insert_error = await insertToSupabase("turnos", {
        fecha: fecha,
        hora: hora,
        id_usuario: idUsuario 
    });
    if (insert_error.error) {
        console.log(insert_error);
        return res.status(500).send('Error inserting data');
    }
    res.send("turno creado exitosamente");
} )
app.get("/turnos", async (req,res) =>{
    const { data, error } = await supabase
        .from('turnos')
        .select('*');
    if (error) {
        console.error('Error fetching data:', error.message);
        return res.status(500).send('Error fetching data');
    }
    res.send(data);
})

app.post("/login", authenticateToken, async (req,res) =>{

    const body = req.body;
    const name = body.name;
    const password = body.password;

    const { data, error } = await supabase
        .from('Usuarios')
        .select()
        .eq('nombre_usuarios', body.name);
    
    if(!data[0]){
        res.status(500).send('User not found');    }
    let compared = await bcrypt.compareSync(password, data[0].password_usuarios);
    if (compared){
        const id = data[0].id_usuarios;
        const accessToken = jwt.sign({id: id}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'});
        res.json(accessToken);
    }
    else{
        res.send("Password incorrect");
    }
    if (error) { 
        res.status(500).send('Error inserting data');
    }
})
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}/`);
});