import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.usuario.findMany();
    res.json({ ok: true, data: users });
  } catch (error) {
    res.status(500).json({ error: "Error al listar usuarios" });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { nombre, email } = req.body;
    const user = await prisma.usuario.create({
      data: { nombre, email },
    });
    res.status(201).json({ ok: true, data: user });
  } catch (error) {
    res.status(400).json({ error: "No se pudo crear el usuario" });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { nombre, email } = req.body;
    const usuario = await prisma.usuario.update({
      where: { id },
      data: { nombre, email },
    });
    res.json({ ok: true, data: usuario });
  } catch (error) {
    res.status(400).json({ error: "No se pudo actualizar el usuario" });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await prisma.usuario.delete({ where: { id } });
    res.json({ ok: true, mensaje: "Usuario eliminado" });
  } catch (error) {
    res.status(400).json({ error: "No se pudo eliminar el usuario" });
  }
};
