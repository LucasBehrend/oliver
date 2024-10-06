import { createClient } from '@supabase/supabase-js';
import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import cors from 'cors';


dotenv.config();
const supabaseUrl = 'https://rujclvrxksqnijyqcwgz.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const app = express();
app.use(cors({
    origin: "*",
    methods: ['POST', 'PUT', 'GET', 'DELETE', 'OPTIONS', 'HEAD'],
    credentials: true,
    allowedHeaders: '*'
}));
app.set("trust proxy", 1);
const port = 3000;

app.use(express.json());

function authenticateToken (req, res, next) {
    //Bearer token
    console.log("sasa");
    const authHeader = req.headers['authorization'];
    console.log(authHeader);
    const token = authHeader && authHeader.split(' ')[1];
    console.log(token);
    // let token_limpio = token.slice(1, -1);
    // console.log(token_limpio);
    if (token === null) return res.sendStatus(401);
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err,id) => {
        if (err) return res.status(403); //token expiration
        req.id = id;
        console.log("fin");
        next();
    })
}
async function insertToSupabase(table, values) {
    const error = await supabase
        .from(table)
        .insert(values);
    return error;
}
async function updateToSupabase(table, values, campo, id) {
    const error = await supabase
        .from(table)
        .update(values)
        .eq(campo, id);
    return error;
}
app.get("/", async (req,res) =>{
    res.send("hola vercel");
})
app.post("/turnos", authenticateToken, async (req, res) =>{
    const body = req.body;
    const fecha = body.fecha;
    const hora = body.hora;
    const motivo = body.motivo;
    const descripcion = body.descripcion;
    const insert_error = await insertToSupabase("turnos", {
        fecha: fecha,
        hora: hora,
        id_usuario: req.id.id,
        motivo: motivo,
        descripcion: descripcion
    });
    if (insert_error.error) {
        console.log("log", insert_error);
        return res.status(500).send('Error inserting data');
    }
    res.send("turno creado exitosamente");
} )
app.get("/turnos", authenticateToken, async (req,res) =>{
    const { data, error } = await supabase
        .from('turnos')
        .select('*');
    if (error) {
        console.error('Error fetching data:', error.message);
        return res.status(500).send('Error fetching data');
    }
    console.log(data);
    console.log((data.filter(data => data.id === req.id.id)));
    res.send(data.filter(data => data.id_usuario === req.id.id));
})

app.post("/login",  async (req,res) =>{

    const body = req.body;
    const name = body.name;
    const password = body.password;

    const { data, error } = await supabase
        .from('usuarios')
        .select()
        .eq('usuario', body.nombre);
    console.log(data);
    if(!data[0]){
        res.status(500).send('User not found');
    }
    let compared = await bcrypt.compareSync(password, data[0].password);
    if (compared){
        const id = data[0].id;
        const accessToken = jwt.sign({id: id}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'});
        res.json({accessToken: accessToken});
    }
    else{
        res.send("Password incorrect");
    }
    if (error) { 
        res.status(500).send('Error inserting data');
    }
})
app.post('/signup', async (req,res)=> {
    const body = req.body;
    const password = await bcrypt.hash(body.password, 10);
    
    const { data, error } = await supabase
        .from("usuarios")
        .insert({
            usuario: body.mail,
            password: password,
            admin: false
        })
        .select();
    if (error){
        res.status(500).send('Error inserting data');
    }
    if(!data[0]){
        res.status(500).send('Error selecting data');
    }
    const error_insert_usuarios = await insertToSupabase("perfiles",{
        id_usuario: data[0].id,
    })
    // const error_update_perfiles = await updateToSupabase("perfiles",{
    //     nombre: body.nombre,
    //     apellido: body.apellido,
    //     edad: body.edad,
    // }, "id_usuario", data[0].id);
    if (error_insert_usuarios.error) {
       console.log(error_insert_usuarios);
       return res.status(500).send('Error posting data: '+ error_insert_usuarios.error);
    }
    // if (error_update_perfiles.error) {
    //     console.log(error_update_perfiles);
    //     return res.status(500).send('Error posting data: '+ error_update_perfiles.error);
    // }
    // else if (error_update_perfiles.error) {
    //     console.log(error_update_perfiles);
    //     return res.status(500).send('Error posting data: '+ error_update_perfiles.error);
    // }
    else {
        return res.send(`User created successfully.`);
    }
})
app.post("/perfil", authenticateToken, async (req,res) => {
    const body = req.body;
    const error_update_perfiles = await updateToSupabase("perfiles",{
        nombre: body.nombre,
        apellido: body.apellido,
        edad: body.edad,
    }, "id_usuario", data[0].id);
    if (error_update_perfiles.error) {
        console.log(error_update_perfiles);
        return res.status(500).send('Error posting data: '+ error_update_perfiles.error);
    }
    res.send("Perfil actualizado correctamente.");
})
app.get("/perfil", authenticateToken, async (req,res) => {
    
})
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}/`);
});