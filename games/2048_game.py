import pygame
import random
import sys

# Initialize pygame
pygame.init()

# Setup Screen
WIDTH, HEIGHT = 500, 600
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("2048 - Modern Theme")
clock = pygame.time.Clock()

# Fonts
pygame.font.init()
font = pygame.font.SysFont("clear-sans, segoeui", 40, bold=True)
score_font = pygame.font.SysFont("clear-sans, segoeui", 24, bold=True)
title_font = pygame.font.SysFont("clear-sans, segoeui", 60, bold=True)
small_font = pygame.font.SysFont("clear-sans, segoeui", 16, bold=True)

# Color Palette (Clear Sans / 2048 Default style)
COLORS = {
    "bg": (250, 248, 239),
    "grid_bg": (187, 173, 160),
    "cell_empty": (205, 193, 180),
    "text_dark": (119, 110, 101),
    "text_light": (249, 246, 242),
    2: (238, 228, 218),
    4: (237, 224, 200),
    8: (242, 177, 121),
    16: (245, 149, 99),
    32: (246, 124, 95),
    64: (246, 94, 59),
    128: (237, 207, 114),
    256: (237, 204, 97),
    512: (237, 200, 80),
    1024: (237, 197, 63),
    2048: (237, 194, 46),
    'beyond': (60, 58, 50)
}

CELL_SIZE = 100
MARGIN = 15
GRID_START_Y = 150

class Game2048:
    def __init__(self):
        self.grid = [[0] * 4 for _ in range(4)]
        self.score = 0
        self.high_score = 0
        self.state = "PLAYING" # PLAYING, GAME_OVER, WON
        self.won = False
        self.add_new_tile()
        self.add_new_tile()

    def add_new_tile(self):
        empty_cells = [(r, c) for r in range(4) for c in range(4) if self.grid[r][c] == 0]
        if empty_cells:
            r, c = random.choice(empty_cells)
            self.grid[r][c] = 2 if random.random() < 0.9 else 4

    def compress(self, grid):
        changed = False
        new_grid = [[0] * 4 for _ in range(4)]
        for i in range(4):
            pos = 0
            for j in range(4):
                if grid[i][j] != 0:
                    new_grid[i][pos] = grid[i][j]
                    if j != pos:
                        changed = True
                    pos += 1
        return new_grid, changed

    def merge(self, grid):
        changed = False
        for i in range(4):
            for j in range(3):
                if grid[i][j] == grid[i][j+1] and grid[i][j] != 0:
                    grid[i][j] *= 2
                    grid[i][j+1] = 0
                    self.score += grid[i][j]
                    changed = True
                    if grid[i][j] == 2048 and not self.won:
                        self.state = "WON"
                        self.won = True
        return grid, changed

    def reverse(self, grid):
        new_grid = []
        for i in range(4):
            new_grid.append(grid[i][::-1])
        return new_grid

    def transpose(self, grid):
        new_grid = [[0] * 4 for _ in range(4)]
        for i in range(4):
            for j in range(4):
                new_grid[i][j] = grid[j][i]
        return new_grid

    def move_left(self):
        grid, changed1 = self.compress(self.grid)
        grid, changed2 = self.merge(grid)
        changed = changed1 or changed2
        self.grid, _ = self.compress(grid)
        return changed

    def move_right(self):
        self.grid = self.reverse(self.grid)
        changed = self.move_left()
        self.grid = self.reverse(self.grid)
        return changed

    def move_up(self):
        self.grid = self.transpose(self.grid)
        changed = self.move_left()
        self.grid = self.transpose(self.grid)
        return changed

    def move_down(self):
        self.grid = self.transpose(self.grid)
        changed = self.move_right()
        self.grid = self.transpose(self.grid)
        return changed

    def check_game_over(self):
        # Any empty?
        for r in range(4):
            for c in range(4):
                if self.grid[r][c] == 0:
                    return False
        # Any merges possible?
        for r in range(4):
            for c in range(3):
                if self.grid[r][c] == self.grid[r][c+1]:
                    return False
        for r in range(3):
            for c in range(4):
                if self.grid[r][c] == self.grid[r+1][c]:
                    return False
        return True

    def reset(self):
        self.grid = [[0] * 4 for _ in range(4)]
        self.score = 0
        self.state = "PLAYING"
        self.won = False
        self.add_new_tile()
        self.add_new_tile()

def draw_rounded_rect(surface, color, rect, radius=10):
    pygame.draw.rect(surface, color, rect, border_radius=radius)

def draw_game(game):
    screen.fill(COLORS["bg"])
    
    # Header
    title = title_font.render("2048", True, COLORS["text_dark"])
    screen.blit(title, (MARGIN, 20))
    
    # Score boxes
    score_bg = pygame.Rect(WIDTH - 210, 25, 90, 55)
    best_bg = pygame.Rect(WIDTH - 110, 25, 90, 55)
    draw_rounded_rect(screen, COLORS["grid_bg"], score_bg, 5)
    draw_rounded_rect(screen, COLORS["grid_bg"], best_bg, 5)
    
    # Score Text
    lbl_score = small_font.render("SCORE", True, COLORS["text_light"])
    val_score = score_font.render(str(game.score), True, COLORS["text_light"])
    screen.blit(lbl_score, (score_bg.centerx - lbl_score.get_width()//2, score_bg.top + 5))
    screen.blit(val_score, (score_bg.centerx - val_score.get_width()//2, score_bg.top + 25))
    
    lbl_best = small_font.render("BEST", True, COLORS["text_light"])
    val_best = score_font.render(str(game.high_score), True, COLORS["text_light"])
    screen.blit(lbl_best, (best_bg.centerx - lbl_best.get_width()//2, best_bg.top + 5))
    screen.blit(val_best, (best_bg.centerx - val_best.get_width()//2, best_bg.top + 25))
    
    # Instructions
    inst = small_font.render("Join the numbers and get to the 2048 tile!", True, COLORS["text_dark"])
    screen.blit(inst, (MARGIN, 95))

    # Grid background
    grid_bg_rect = pygame.Rect(MARGIN, GRID_START_Y, WIDTH - 2*MARGIN, WIDTH - 2*MARGIN)
    draw_rounded_rect(screen, COLORS["grid_bg"], grid_bg_rect, 10)

    # Cells
    for r in range(4):
        for c in range(4):
            val = game.grid[r][c]
            x = MARGIN + MARGIN + c * (CELL_SIZE + MARGIN)
            y = GRID_START_Y + MARGIN + r * (CELL_SIZE + MARGIN)
            rect = pygame.Rect(x, y, CELL_SIZE, CELL_SIZE)
            
            color = COLORS.get(val, COLORS['beyond']) if val != 0 else COLORS["cell_empty"]
            draw_rounded_rect(screen, color, rect, 5)
            
            if val != 0:
                text_col = COLORS["text_dark"] if val <= 4 else COLORS["text_light"]
                text_font = font if val < 100 else (score_font if val < 1000 else small_font)
                text_surf = text_font.render(str(val), True, text_col)
                screen.blit(text_surf, (x + CELL_SIZE//2 - text_surf.get_width()//2, y + CELL_SIZE//2 - text_surf.get_height()//2))

    # Overlays
    if game.state == "GAME_OVER":
        s = pygame.Surface((WIDTH, HEIGHT), pygame.SRCALPHA)
        s.fill((238, 228, 218, 180))
        screen.blit(s, (0,0))
        msg = title_font.render("Game Over!", True, COLORS["text_dark"])
        screen.blit(msg, (WIDTH//2 - msg.get_width()//2, HEIGHT//2 - 50))
        
    elif game.state == "WON":
        s = pygame.Surface((WIDTH, HEIGHT), pygame.SRCALPHA)
        s.fill((237, 194, 46, 120))
        screen.blit(s, (0,0))
        msg = title_font.render("You Win!", True, COLORS["text_light"])
        screen.blit(msg, (WIDTH//2 - msg.get_width()//2, HEIGHT//2 - 50))
        inst2 = score_font.render("Press SPACE to continue", True, COLORS["text_light"])
        screen.blit(inst2, (WIDTH//2 - inst2.get_width()//2, HEIGHT//2 + 20))

    pygame.display.flip()

def main():
    game = Game2048()
    
    while True:
        changed = False
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            elif event.type == pygame.KEYDOWN:
                if game.state == "GAME_OVER":
                    if event.key == pygame.K_SPACE:
                        game.reset()
                elif game.state == "WON":
                    if event.key == pygame.K_SPACE:
                        game.state = "PLAYING" # Keep playing after winning
                elif game.state == "PLAYING":
                    if event.key == pygame.K_UP or event.key == pygame.K_w:
                        changed = game.move_up()
                    elif event.key == pygame.K_DOWN or event.key == pygame.K_s:
                        changed = game.move_down()
                    elif event.key == pygame.K_LEFT or event.key == pygame.K_a:
                        changed = game.move_left()
                    elif event.key == pygame.K_RIGHT or event.key == pygame.K_d:
                        changed = game.move_right()

                if changed:
                    game.add_new_tile()
                    if game.score > game.high_score:
                        game.high_score = game.score
                    if game.check_game_over() and game.state != "WON":
                        game.state = "GAME_OVER"

        draw_game(game)
        clock.tick(60)

if __name__ == "__main__":
    main()
