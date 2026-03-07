import pygame
import random
import sys

# Initialize Pygame
pygame.init()

# Constants
WIDTH, HEIGHT = 600, 600
GRID_SIZE = 20
GRID_WIDTH = WIDTH // GRID_SIZE
GRID_HEIGHT = HEIGHT // GRID_SIZE

# Colors - Modern Palette
BG_COLOR = (28, 30, 38)
SNAKE_HEAD_COLOR = (46, 204, 113)
SNAKE_BODY_COLOR = (39, 174, 96)
FOOD_COLOR = (231, 76, 60)
TEXT_COLOR = (236, 240, 241)

# Screen setup
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Modern Snake Game")
clock = pygame.time.Clock()
font = pygame.font.SysFont("segoeui", 24, bold=True)
large_font = pygame.font.SysFont("segoeui", 48, bold=True)

class Snake:
    def __init__(self):
        self.positions = [(GRID_WIDTH // 2, GRID_HEIGHT // 2)]
        self.direction = (1, 0)
        self.grow = False

    def get_head_position(self):
        return self.positions[0]

    def turn(self, point):
        # Prevent reversing direction
        if (point[0] * -1, point[1] * -1) == self.direction:
            return
        else:
            self.direction = point

    def move(self):
        cur = self.get_head_position()
        x, y = self.direction
        new = ((cur[0] + x) % GRID_WIDTH, (cur[1] + y) % GRID_HEIGHT)
        
        if new in self.positions[2:]:
            return False # Collision with self
            
        self.positions.insert(0, new)
        if not self.grow:
            self.positions.pop()
        else:
            self.grow = False
        return True

    def reset(self):
        self.positions = [(GRID_WIDTH // 2, GRID_HEIGHT // 2)]
        self.direction = (1, 0)

    def draw(self, surface):
        for index, p in enumerate(self.positions):
            rect = pygame.Rect(p[0] * GRID_SIZE, p[1] * GRID_SIZE, GRID_SIZE, GRID_SIZE)
            color = SNAKE_HEAD_COLOR if index == 0 else SNAKE_BODY_COLOR
            # Draw rounded rectangles for a modern look
            pygame.draw.rect(surface, color, rect, border_radius=4)
            if index == 0: # Add eyes to the head
                eye_radius = 3
                if self.direction == (1, 0): # Right
                    pygame.draw.circle(surface, BG_COLOR, (rect.right - 5, rect.centery - 4), eye_radius)
                    pygame.draw.circle(surface, BG_COLOR, (rect.right - 5, rect.centery + 4), eye_radius)
                elif self.direction == (-1, 0): # Left
                    pygame.draw.circle(surface, BG_COLOR, (rect.left + 5, rect.centery - 4), eye_radius)
                    pygame.draw.circle(surface, BG_COLOR, (rect.left + 5, rect.centery + 4), eye_radius)
                elif self.direction == (0, -1): # Up
                    pygame.draw.circle(surface, BG_COLOR, (rect.centerx - 4, rect.top + 5), eye_radius)
                    pygame.draw.circle(surface, BG_COLOR, (rect.centerx + 4, rect.top + 5), eye_radius)
                elif self.direction == (0, 1): # Down
                    pygame.draw.circle(surface, BG_COLOR, (rect.centerx - 4, rect.bottom - 5), eye_radius)
                    pygame.draw.circle(surface, BG_COLOR, (rect.centerx + 4, rect.bottom - 5), eye_radius)

class Food:
    def __init__(self):
        self.position = (0,0)
        self.randomize_position([])

    def randomize_position(self, snake_positions):
        while True:
            self.position = (random.randint(0, GRID_WIDTH - 1), random.randint(0, GRID_HEIGHT - 1))
            if self.position not in snake_positions:
                break

    def draw(self, surface):
        rect = pygame.Rect(self.position[0] * GRID_SIZE, self.position[1] * GRID_SIZE, GRID_SIZE, GRID_SIZE)
        # Draw circular food
        pygame.draw.circle(surface, FOOD_COLOR, rect.center, GRID_SIZE // 2 - 2)

def draw_grid(surface):
    # Minimalist, no explicit grid lines, just a clean background
    surface.fill(BG_COLOR)

def main():
    snake = Snake()
    food = Food()
    score = 0
    high_score = 0
    state = "PLAYING" # PLAYING, GAME_OVER

    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            elif event.type == pygame.KEYDOWN:
                if state == "GAME_OVER":
                    if event.key == pygame.K_SPACE:
                        snake.reset()
                        food.randomize_position(snake.positions)
                        score = 0
                        state = "PLAYING"
                    elif event.key == pygame.K_ESCAPE:
                        pygame.quit()
                        sys.exit()
                else:
                    if event.key == pygame.K_UP or event.key == pygame.K_w:
                        snake.turn((0, -1))
                    elif event.key == pygame.K_DOWN or event.key == pygame.K_s:
                        snake.turn((0, 1))
                    elif event.key == pygame.K_LEFT or event.key == pygame.K_a:
                        snake.turn((-1, 0))
                    elif event.key == pygame.K_RIGHT or event.key == pygame.K_d:
                        snake.turn((1, 0))

        if state == "PLAYING":
            if not snake.move():
                state = "GAME_OVER"
                if score > high_score:
                    high_score = score
            
            if snake.get_head_position() == food.position:
                snake.grow = True
                score += 10
                food.randomize_position(snake.positions)

        draw_grid(screen)
        
        # Draw game elements
        snake.draw(screen)
        food.draw(screen)
        
        # Draw Score
        score_text = font.render(f"Score: {score}  High Score: {high_score}", True, TEXT_COLOR)
        screen.blit(score_text, (10, 10))

        if state == "GAME_OVER":
            # Darken screen
            s = pygame.Surface((WIDTH,HEIGHT))
            s.set_alpha(128)
            s.fill((0,0,0))
            screen.blit(s, (0,0))
            
            game_over_text = large_font.render("GAME OVER", True, FOOD_COLOR)
            restart_text = font.render("Press SPACE to Restart", True, TEXT_COLOR)
            
            screen.blit(game_over_text, (WIDTH//2 - game_over_text.get_width()//2, HEIGHT//2 - 50))
            screen.blit(restart_text, (WIDTH//2 - restart_text.get_width()//2, HEIGHT//2 + 10))

        pygame.display.update()
        clock.tick(12) # Speed of snake

if __name__ == "__main__":
    main()
