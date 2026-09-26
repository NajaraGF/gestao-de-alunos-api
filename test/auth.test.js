import request from 'supertest';
import { expect } from 'chai';
import mongoose from 'mongoose';
import app from '../src/app.js';
import dados from './dados.json' with { type: 'json' };
import 'dotenv/config';
import { loginAdmin, loginAluno } from './helpers/login.helper.js';

describe('POST /api/auth/login', () => {
  after(async () => {
    await mongoose.connection.close();
  });

  it('deve retornar 200 e um token quando o admin informar e-mail e senha corretos', async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send(dados.admin);

    expect(resposta.status).to.equal(200);
    expect(resposta.body).to.have.property('token');
    expect(resposta.body.usuario.role).to.equal('admin');
  });

  it('deve retornar 401 quando a senha informada for inválida', async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send(dados.adminSenhaInvalida);

    expect(resposta.status).to.equal(401);
    expect(resposta.body.error).to.equal('E-mail ou senha inválidos.');
  });

   it('deve cadastrar um novo aluno quando autenticado como admin', async () => {
     const aluno = {
       ...dados.aluno,
       email: `carolina.${Date.now()}@example.com`,
       matricula: `QA${Date.now()}`
     };
     
     const token = await loginAdmin();
     
     const resposta = await request(app)
       .post('/api/admin/alunos')
       .set('Authorization', `Bearer ${token}`)
       .send(aluno);

     expect(resposta.status).to.equal(201);
     expect(resposta.body.nome).to.equal(dados.aluno.nome);
     
     console.log(resposta.body);
     const alunoId = resposta.body.id;

     const listaDisciplinas = await request(app)
       .get('/api/admin/disciplinas')
       .set('Authorization', `Bearer ${token}`);

     console.log(listaDisciplinas.body);

     const disciplinaId = listaDisciplinas.body[0].id;

     const matricula = await request(app)
       .post(`/api/admin/disciplinas/${disciplinaId}/matriculas`)
       .set('Authorization', `Bearer ${token}`)
       .send({
         alunoId: alunoId
       });

     expect(matricula.status).to.equal(201);

     const disciplinas = await request(app)
       .get(`/api/alunos/${alunoId}/disciplinas`)
       .set('Authorization', `Bearer ${token}`);

     console.log(disciplinas.body);

      const tokenAluno = await loginAluno(aluno.email, aluno.senha);
      
     console.log(tokenAluno);

     const trabalho = await request(app)
       .post(`/api/alunos/${alunoId}/trabalhos`)
       .set('Authorization', `Bearer ${tokenAluno}`)
       .send({
         disciplinaId: disciplinaId,
         titulo: 'Trabalho de Matemática',
         descricao: 'Trabalho entregue pelo aluno'
       });

     console.log(trabalho.body);

     expect(trabalho.status).to.equal(201);
});
});
