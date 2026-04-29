import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FriendRequest } from "./friendrequest.entity";
import { Repository } from "typeorm/repository/Repository.js";
import { User } from "src/users/users.service";


@Injectable()
export default class FriendService {
  constructor(@InjectRepository(FriendRequest) private readonly friendRequestRepository: Repository<FriendRequest>) {}

  async sendFriendRequest(sender: User, receiver: User) {
    if (sender.id === receiver.id) throw new Error('Cannot send friend request to yourself');
    const existingRequest = await this.friendRequestRepository.findOne({ where: [
      { sender: sender, receiver: receiver },
      { sender: receiver, receiver: sender },
    ] });
    if (existingRequest) {
      if (existingRequest.status === 'pending') throw new Error('Friend request already pending');
      if (existingRequest.status === 'accepted') throw new Error('You are already friends');
      existingRequest.status = 'pending';
      await this.friendRequestRepository.save(existingRequest);
      return;
    }
    const newRequest = this.friendRequestRepository.create({ sender, receiver, status: 'pending' });
    await this.friendRequestRepository.save(newRequest);
  }


  async acceptFriendRequest(requestId: number, user: User) {
    const request = await this.friendRequestRepository.findOne({ where: { id: requestId }, relations: ['sender', 'receiver'] });
    if (!request) throw new Error('Friend request not found');
    if (request.receiver.id !== user.id) throw new Error('Not authorized to accept this friend request');
    request.status = 'accepted';
    await this.friendRequestRepository.save(request);
  }

  async rejectFriendRequest(requestId: number, user: User) {
    const request = await this.friendRequestRepository.findOne({ where: { id: requestId }, relations: ['sender', 'receiver'] });
    if (!request) throw new Error('Friend request not found');
    if (request.receiver.id !== user.id) throw new Error('Not authorized to reject this friend request');
    request.status = 'rejected';
    await this.friendRequestRepository.save(request);
  }

  async getFriends(user: User): Promise<object[]> {
    const requests = await this.friendRequestRepository.find({
      where: [
        { sender: { id: user.id }, status: 'accepted' },
        { receiver: { id: user.id }, status: 'accepted' },
      ],
      relations: ['sender', 'receiver'],
    });
    return requests.map((req) => {
      const friend = req.sender.id === user.id ? req.receiver : req.sender;
      return { id: friend.id, uuid: friend.uuid, username: friend.username };
    });
  }

  async getPendingIncoming(user: User): Promise<object[]> {
    const requests = await this.friendRequestRepository.find({
      where: { receiver: { id: user.id }, status: 'pending' },
      relations: ['sender'],
    });
    return requests.map((req) => ({
      id: req.id,
      createdAt: req.createdAt,
      sender: { uuid: req.sender.uuid, username: req.sender.username },
    }));
  }

  async getSentPending(user: User): Promise<object[]> {
    const requests = await this.friendRequestRepository.find({
      where: { sender: { id: user.id }, status: 'pending' },
      relations: ['receiver'],
    });
    return requests.map((req) => ({
      id: req.id,
      createdAt: req.createdAt,
      receiver: { uuid: req.receiver.uuid, username: req.receiver.username },
    }));
  }

  async removeFriend(user: User, target: User): Promise<void> {
    const request = await this.friendRequestRepository.findOne({
      where: [
        { sender: { id: user.id }, receiver: { id: target.id }, status: 'accepted' },
        { sender: { id: target.id }, receiver: { id: user.id }, status: 'accepted' },
      ],
    });
    if (!request) throw new NotFoundException('You are not friends with this user');
    await this.friendRequestRepository.remove(request);
  }
}