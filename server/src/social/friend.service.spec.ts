import { NotFoundException } from '@nestjs/common';
import { User } from 'src/users/users.service';
import FriendService from './friend.service';

describe('FriendService', () => {
  const repo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  } as any;

  const sender = {
    id: 1,
    uuid: 'u1',
    username: 'alice',
  } as User;

  const receiver = {
    id: 2,
    uuid: 'u2',
    username: 'bob',
  } as User;

  let service: FriendService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FriendService(repo);
  });

  describe('sendFriendRequest', () => {
    it('rejects request to self', async () => {
      await expect(service.sendFriendRequest(sender, sender)).rejects.toThrow(
        'Cannot send friend request to yourself',
      );
    });

    it('rejects when request is already pending', async () => {
      repo.findOne.mockResolvedValue({ status: 'pending' });

      await expect(service.sendFriendRequest(sender, receiver)).rejects.toThrow(
        'Friend request already pending',
      );
    });

    it('re-opens a rejected request', async () => {
      const existing = { status: 'rejected' };
      repo.findOne.mockResolvedValue(existing);

      await service.sendFriendRequest(sender, receiver);

      expect(existing.status).toBe('pending');
      expect(repo.save).toHaveBeenCalledWith(existing);
    });

    it('creates a new request when none exists', async () => {
      const created = { sender, receiver, status: 'pending' };
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(created);

      await service.sendFriendRequest(sender, receiver);

      expect(repo.create).toHaveBeenCalledWith({
        sender,
        receiver,
        status: 'pending',
      });
      expect(repo.save).toHaveBeenCalledWith(created);
    });
  });

  describe('getFriends', () => {
    it('maps accepted requests to friend summaries', async () => {
      repo.find.mockResolvedValue([
        { sender, receiver, status: 'accepted' },
        { sender: receiver, receiver: sender, status: 'accepted' },
      ]);

      await expect(service.getFriends(sender)).resolves.toEqual([
        { id: receiver.id, uuid: receiver.uuid, username: receiver.username },
        { id: receiver.id, uuid: receiver.uuid, username: receiver.username },
      ]);
    });
  });

  describe('removeFriend', () => {
    it('throws when friendship does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.removeFriend(sender, receiver)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('removes an accepted friendship', async () => {
      const request = { id: 7, sender, receiver, status: 'accepted' };
      repo.findOne.mockResolvedValue(request);

      await service.removeFriend(sender, receiver);

      expect(repo.remove).toHaveBeenCalledWith(request);
    });
  });
});
